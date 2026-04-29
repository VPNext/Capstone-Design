#해당 파일은 데이터 베이스에서 같은 뉴스사의 동일 뉴스가 있는지 체크 및 중복 뉴스 제거를 위한 파일입니다.
import difflib
import sqlite3

# 데이터 베이스(sqlite)에서 제목을 기준으로 중복뉴스 확인 및 제거 함수
def remove_duplicate_news_sqlite(db_connection, threshold=0.8):
    cursor = db_connection.cursor()
    cursor.execute("SELECT id, title FROM articles")
    # id와 제목을 가져옴
    articles = cursor.fetchall()

    seen_titles = {}
    duplicates = []

    for article_id, title in articles:
        # 제목을 소문자로 변환하고 공백 제거
        normalized_title = title.strip().lower()
        # 이미 본 제목이 있는지 체크
        if normalized_title in seen_titles:
            # 동일한 제목이 이미 존재하므로 중복으로 간주
            duplicates.append(article_id)
        else:
            # 유사한 제목이 있는지 체크
            for seen_title in seen_titles.keys():
                similarity = difflib.SequenceMatcher(None, normalized_title, seen_title).ratio()
                if similarity > threshold:
                    duplicates.append(article_id)
                    break
            else:
                seen_titles[normalized_title] = article_id

    # 중복 뉴스 제거
    if duplicates:
        cursor.executemany("DELETE FROM articles WHERE id = ?", [(dup_id,) for dup_id in duplicates])
        db_connection.commit()
        print(f"{len(duplicates)}개의 중복 뉴스가 제거되었습니다.")
    else:
        print("중복된 뉴스가 없습니다.")
#해당 함수는 데이터베이스 연결과 유사도 임계값을 받아서 중복 뉴스를 제거하는 함수입니다. 제목을 기준으로 중복 여부를 판단하며, 유사도가 임계값 이상인 경우에도 중복으로 간주하여 제거합니다.
#사용을 할려면 remove_duplicate_news_sqlite(sqlite3.connect('news_compass.db')) 와 같이 데이터베이스 연결을 인자로 넘겨주면 됩니다.
#함수를 호출해야 하는 곳은 scheduler.py의 job() 함수 내에서 크롤링 후 저장이 완료된 다음에 호출하는 것이 적절합니다. 이렇게 하면 새로운 뉴스가 추가된 후에 중복 뉴스 제거가 이루어지게 됩니다.
