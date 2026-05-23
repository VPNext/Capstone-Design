#이 파일은 백엔드 서버를 재시작하는 스크립트입니다.
#백엔드 서버가 실행 중일 때 이 파일을 실행하면 서버가 재시작됩니다.
#백엔드 코드가 변경된 후에 이 파일을 실행하면 변경된 코드가 반영된 상태로 서버가 재시작됩니다.


import os
import subprocess
import time
import sys
def restart_backend():
    #백엔드 서버 프로세스 찾기
    #만약에 백엔드 서버가 실행중이 아니면 아무것도 하지 않음
    if not os.path.exists('main.py'):
        print('main.py 파일이 존재하지 않습니다. 백엔드 서버가 실행 중인지 확인하세요.')
        return
    
    print('Stopping backend server...')
    #백엔드 서버가 사용하는 포트 번호로 프로세스 찾기
    PORT = 8000
    def _pids_on_port(port: int):
        try:
            res = subprocess.run(['lsof', '-ti', f'TCP:{port}', '-sTCP:LISTEN'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            out = (res.stdout or '').strip()
            if out:
                return [int(x) for x in out.splitlines() if x.strip()]
        except Exception:
            pass
        # lsof가 실패할 경우, netstat으로 대체 시도
        try:
            res = subprocess.run(['lsof', f'-iTCP:{port}', '-sTCP:LISTEN'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            lines = (res.stdout or '').strip().splitlines()
            pids = []
            for line in lines[1:]:
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        pids.append(int(parts[1]))
                    except Exception:
                        continue
            return pids
        except Exception:
            return []
    # 먼저 포트에서 직접 프로세스를 찾고 종료 시도
    pids = _pids_on_port(PORT)
    if pids:
        for pid in pids:
            try:
                print(f'Killing process listening on port {PORT}: PID {pid}')
                os.kill(pid, 9)
            except Exception as e:
                print(f'Failed to kill PID {pid}: {e}')
    else:
        #포트에서 프로세스를 찾지 못하면, uvicorn 프로세스 전체를 찾아서 종료 시도
        try:
            result = subprocess.run(['pgrep', '-f', 'uvicorn'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            pids = [int(x) for x in (result.stdout or '').strip().split() if x.strip()]
            for pid in pids:
                try:
                    print(f'Killing uvicorn process PID {pid}')
                    os.kill(pid, 9)
                except Exception as e:
                    print(f'Failed to kill PID {pid}: {e}')
        except Exception:
            pass

    # 기다려서 포트가 해제될 때까지 확인
    timeout = 15.0
    interval = 0.5
    waited = 0.0
    while waited < timeout:
        remaining = _pids_on_port(PORT)
        if not remaining:
            break
        print(f'포트 {PORT} 여전히 사용 중(PIDs: {remaining}), 대기 {interval}s...')
        time.sleep(interval)
        waited += interval

    if waited >= timeout:
        print(f'경고: 포트 {PORT}가 아직 해제되지 않았습니다. ({remaining})')

    print('Starting backend server...')
    #백엔드 서버 실행
    #--reload 옵션을 사용하여 코드 변경 시 자동으로 서버가 재시작되도록 설정
    subprocess.Popen([sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', str(PORT), '--reload'])
restart_backend()
