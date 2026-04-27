import axios from "axios";

// 백엔드 서버의 기본 주소 설정
const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
