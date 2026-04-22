// Google Apps Script — Daily Wins
// 배포: 확장 프로그램 > Apps Script > 배포 > 새 배포 > 웹 앱
//   - 실행 계정: 본인
//   - 액세스: 모든 사용자(익명 포함)
// 생성된 URL을 script.js의 SCRIPT_URL에 붙여넣으세요.

const SHEET_NAME   = 'Daily Wins';
const HEADER_ROW   = ['날짜', '수행 목표', '수행 시간(분)', '메모', '기록 시각'];

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    sheet.appendRow([
      data.date     || '',
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
