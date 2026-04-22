// Google Apps Script — Daily Wins
// 배포: 확장 프로그램 > Apps Script > 배포 > 새 배포 > 웹 앱
//   - 실행 계정: 본인
//   - 액세스: 모든 사용자(익명 포함)
// 생성된 URL을 script.js의 SCRIPT_URL에 붙여넣으세요.

const SHEET_NAME   = 'Daily Wins';
const HEADER_ROW   = ['날짜', '시간대', '수행 목표', '수행 시간(분)', '메모', '기록 시각'];

// Apps Script 에디터에서 직접 실행해 시트를 초기화합니다.
// 시트가 없으면 생성, 있으면 헤더 행을 재설정합니다.
function initialize() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('연결된 스프레드시트: ' + ss.getName());

  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    Logger.log('시트 생성: ' + SHEET_NAME);
  } else {
    Logger.log('기존 시트 발견: ' + SHEET_NAME);
  }

  // 헤더 행 강제 세팅 (기존 시트여도 적용)
  const header = sheet.getRange(1, 1, 1, HEADER_ROW.length);
  header.setValues([HEADER_ROW]);
  header.setFontWeight('bold');
  header.setBackground('#4F46E5');
  header.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, HEADER_ROW.length, 160);

  ss.setActiveSheet(sheet);
  Logger.log('초기화 완료. 헤더: ' + HEADER_ROW.join(', '));
}

function doGet() {
  try {
    const sheet = getOrCreateSheet();
    const rows  = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return jsonResponse({ result: 'success', data: [] });
    }
    const tz   = Session.getScriptTimeZone();
    const data = rows.slice(1)
      .filter(row => row[0] !== '')
      .map(row => ({
        date:     row[0] instanceof Date
                  ? Utilities.formatDate(row[0], tz, 'yyyy-MM-dd')
                  : String(row[0]),
        timeslot: row[1] || '',
        activity: row[2] || '',
        duration: Number(row[3]) || 0,
        memo:     row[4] || '',
      }));
    return jsonResponse({ result: 'success', data });
  } catch (err) {
    return jsonResponse({ result: 'error', message: err.message });
  }
}

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    sheet.appendRow([
      data.date     || '',
      data.timeslot || '',
      data.activity || '',
      Number(data.duration) || 0,
      data.memo     || '',
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    return jsonResponse({ result: 'success' });
  } catch (err) {
    return jsonResponse({ result: 'error', message: err.message }, 500);
  }
}

// ─── Helpers ──────────────────────────────────────────

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const header = sheet.getRange(1, 1, 1, HEADER_ROW.length);
    header.setValues([HEADER_ROW]);
    header.setFontWeight('bold');
    header.setBackground('#4F46E5');
    header.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADER_ROW.length, 160);
  }

  return sheet;
}

function jsonResponse(obj, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
