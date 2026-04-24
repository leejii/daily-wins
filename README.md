# ✦ Daily Wins

매일 수행한 습관을 간단한 폼으로 기록하고, 데이터를 Google Sheets에 자동 저장하는 웹 앱입니다.

## 개요

```
사용자 → 웹 폼 입력 → Google Apps Script (doPost) → Google Sheets 저장
                                                              ↑
                           통계 페이지 (stats.html) ─── doGet() 으로 조회
```

## 기술 스택

- **Frontend**: HTML, CSS, JavaScript (바닐라)
- **Backend**: Google Apps Script (Web App)
- **데이터베이스**: Google Sheets

## 파일 구조

```
daily-wins/
├── index.html       # 기록 입력 폼
├── stats.html       # 통계 조회 페이지
├── style.css        # 공통 스타일
├── script.js        # 폼 로직 및 Apps Script 연동
├── stats.js         # 통계 데이터 fetch / 캘린더·그래프 렌더링
└── apps-script.gs   # Google Apps Script (doPost / doGet / initialize)
```

## 기록 입력 폼 (`index.html`)

| 필드 | 설명 |
|------|------|
| 날짜 | 오늘 날짜 기본값, 전체 영역 클릭 시 캘린더 선택 가능 |
| 시간대 | 오전 / 오후 / 저녁 (현재 시각 기준 자동 선택) |
| 수행 목표 | 운동 / 스트레칭 / 독서 / 영어 / 말 / 기타 (직접 입력) |
| 수행 시간 | 10분 ~ 60분, 5분 단위 슬라이더 |
| 메모 | 최대 200자 자유 입력 |

## 통계 페이지 (`stats.html`)

Google Sheets 데이터를 불러와 세 가지 섹션으로 시각화합니다.

- **요약 카드**: 총 기록 횟수 · 연속 달성 일수 · 가장 많은 활동
- **캘린더**: 월별 기록 현황 (1회: 연보라 / 2회 이상: 진보라 / 오늘: 앰버 테두리), 날짜 클릭 시 당일 상세 기록 조회
- **그래프**: 활동별 누적 횟수(가로 막대) / 주간 수행 시간 합계(세로 막대), 탭 전환

## Google Sheets 컬럼 구조

| 날짜 | 시간대 | 수행 목표 | 수행 시간(분) | 메모 | 기록 시각 |
|------|--------|-----------|---------------|------|-----------|
| 2026-04-24 | 오전 | 운동 | 30 | — | 2026-04-24 09:00:00 |

## Google Apps Script 연동 설정

### 1. 스크립트 생성 및 배포

1. Google Sheets 열기 → **확장 프로그램 > Apps Script**
2. `apps-script.gs` 내용 전체 붙여넣기
3. **배포 > 새 배포** 클릭
   - 유형: **웹 앱**
   - 실행 계정: 본인
   - 액세스: **모든 사용자(익명 포함)**
4. 생성된 URL 복사

### 2. URL 설정

`script.js`와 `stats.js` 상단의 `SCRIPT_URL`을 배포된 URL로 교체합니다.

```js
const SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```

> 두 파일의 URL을 항상 동일하게 유지하세요.

### 3. 코드 수정 후 재배포

코드를 수정했을 때는 **새 배포가 아닌 기존 배포 업데이트**를 사용해야 URL이 유지됩니다.

```
배포 > 배포 관리 > 연필(편집) 아이콘 > 버전: 새 버전 선택 > 배포
```

### 4. 시트 초기화 (선택)

Apps Script 에디터에서 `initialize()` 함수를 실행하면 헤더 행과 서식이 생성됩니다.
이미 시트가 존재해도 헤더를 재설정합니다.

## 로컬 실행

빌드 과정 없이 브라우저에서 직접 열거나 로컬 서버를 사용합니다.

```bash
npx http-server .
# → http://localhost:8080
```

> `SCRIPT_URL`이 설정되어 있어야 저장 및 통계 조회 기능이 동작합니다.
