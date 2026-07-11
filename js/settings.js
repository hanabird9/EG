// 설정 관리 모듈
import { getSettings, updateSettings, seedDemoData } from './db.js';
import { showToast } from './dashboard.js';

export function renderSettings(container) {
  const settings = getSettings();

  container.innerHTML = `
    <h2 class="mb-2" style="font-weight: 700;">설정</h2>
    
    <!-- 1. 메시지 템플릿 관리 -->
    <div class="card">
      <h3 class="mb-2" style="font-weight: 600; display:flex; align-items:center; gap:0.5rem;">
        <i data-lucide="message-square"></i> 알림 메시지 템플릿 설정
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
        ※ 치환 가능한 키워드: <b>[학생이름]</b>, <b>[과목]</b>, <b>[수업일자]</b>, <b>[출결상태]</b>, <b>[수업내용]</b>
      </p>

      <form id="template-settings-form">
        <div class="form-group">
          <label>이메일 템플릿</label>
          <textarea class="form-control" name="emailTemplate" rows="4" style="font-family: monospace; font-size: 0.85rem;" required>${settings.templates.email}</textarea>
        </div>

        <div class="form-group">
          <label>WhatsApp 템플릿</label>
          <textarea class="form-control" name="whatsappTemplate" rows="4" style="font-family: monospace; font-size: 0.85rem;" required>${settings.templates.whatsapp}</textarea>
        </div>

        <div class="form-group">
          <label>카카오톡 템플릿</label>
          <textarea class="form-control" name="kakaotalkTemplate" rows="4" style="font-family: monospace; font-size: 0.85rem;" required>${settings.templates.kakaotalk}</textarea>
        </div>

        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> 템플릿 저장</button>
      </form>
    </div>

    <!-- 2. 이메일 전송 서비스 설정 (EmailJS / Resend) -->
    <div class="card">
      <h3 class="mb-2" style="font-weight: 600; display:flex; align-items:center; gap:0.5rem;">
        <i data-lucide="mail"></i> 이메일 자동 발송 서비스 설정
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
        기본 발송 시 PC/모바일 메일 앱이 열리지만, 이메일 API 연동 정보를 입력하면 <b>백그라운드에서 완전히 자동으로 발송</b>됩니다.
      </p>
      
      <form id="emailjs-settings-form">
        <div class="form-group">
          <label>발송 서비스 방식</label>
          <select class="form-control" name="provider">
            <option value="mailto" ${settings.emailService?.provider !== 'emailjs' && settings.emailService?.provider !== 'resend' && settings.emailService?.provider !== 'gmail-gas' ? 'selected' : ''}>기본 메일 클라이언트 실행 (mailto)</option>
            <option value="emailjs" ${settings.emailService?.provider === 'emailjs' ? 'selected' : ''}>EmailJS 자동 발송 API 연동 (서버리스 환경 작동)</option>
            <option value="resend" ${settings.emailService?.provider === 'resend' ? 'selected' : ''}>Resend 자동 발송 API 연동 (로컬 백엔드 환경 전용)</option>
            <option value="gmail-gas" ${settings.emailService?.provider === 'gmail-gas' ? 'selected' : ''}>Google Apps Script 연동 (지메일 전용 - 일 100건 무료 & 서버리스 추천)</option>
          </select>
        </div>

        <div id="emailjs-fields" style="display: ${settings.emailService?.provider === 'emailjs' ? 'block' : 'none'};">
          <div class="form-group">
            <label>EmailJS Service ID</label>
            <input type="text" class="form-control" name="serviceId" value="${settings.emailService?.emailjsServiceId || ''}" placeholder="예: service_xxxxxx">
          </div>
          <div class="form-group">
            <label>EmailJS Template ID</label>
            <input type="text" class="form-control" name="templateId" value="${settings.emailService?.emailjsTemplateId || ''}" placeholder="예: template_xxxxxx">
          </div>
          <div class="form-group">
            <label>EmailJS Public Key (User ID)</label>
            <input type="text" class="form-control" name="userId" value="${settings.emailService?.emailjsUserId || ''}" placeholder="예: user_xxxxxxxxxxxxx">
          </div>
        </div>

        <div id="resend-fields" style="display: ${settings.emailService?.provider === 'resend' ? 'block' : 'none'};">
          <div class="form-group">
            <label>Resend API Key</label>
            <input type="password" class="form-control" name="resendApiKey" value="${settings.emailService?.resendApiKey || ''}" placeholder="예: re_xxxxxxxxxxxxxxxxx">
          </div>
          <div class="form-group">
            <label>발송인 이메일 (From Email) *</label>
            <input type="email" class="form-control" name="resendFromEmail" value="${settings.emailService?.resendFromEmail || 'onboarding@resend.dev'}" placeholder="예: info@yourdomain.com">
            <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">
              ※ <b>[주의]</b> Resend는 로컬 프록시 백엔드(server.ps1) 구동 환경에서만 작동하며, 향후 GitHub Pages 등 정적 서버리스 환경으로 올렸을 때는 발송이 제한됩니다.
            </p>
          </div>
        </div>

        <div id="gmail-gas-fields" style="display: ${settings.emailService?.provider === 'gmail-gas' ? 'block' : 'none'};">
          <div class="form-group">
            <label>Google Apps Script Web App URL</label>
            <input type="url" class="form-control" name="gmailGasUrl" value="${settings.emailService?.gmailGasUrl || ''}" placeholder="https://script.google.com/macros/s/.../exec">
          </div>
          
          <div style="background-color: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; margin-top: 1rem; font-size: 0.85rem;">
            <h4 style="font-weight:600; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.25rem; font-size:0.9rem;">
              <i data-lucide="help-circle" style="width:16px; height:16px; color:var(--accent);"></i> 연동 설정 가이드 (1분 소요)
            </h4>
            <ol style="margin-left:1.25rem; line-height:1.6; color:var(--text-secondary); display:flex; flex-direction:column; gap:0.25rem; font-size:0.8rem;">
              <li><a href="https://script.google.com" target="_blank" style="color:var(--accent); font-weight:600; text-decoration:underline;">Google Apps Script 대시보드</a>에 접속 및 로그인합니다.</li>
              <li>왼쪽 상단 <b>[새 프로젝트]</b> 버튼을 클릭합니다.</li>
              <li>화면의 기본 코드를 모두 지우고 아래의 스크립트 코드를 복사해서 붙여넣습니다.</li>
              <li>우측 상단 <b>[배포] ➔ [새 배포]</b>를 클릭합니다.</li>
              <li>유형 선택(톱니바퀴 아이콘)에서 <b>[웹 앱]</b>을 선택합니다.</li>
              <li>설정에서 웹 앱 실행 옵션을 <b>[나]</b>로, 액세스 권한 보유자를 <b>[모든 사용자]</b>로 설정한 후 <b>[배포]</b>를 누릅니다.</li>
              <li>구글 계정 권한 승인 창이 뜨면 승인 완료 후 생성되는 <b>[웹 앱 URL]</b>을 복사하여 위의 입력창에 붙여넣습니다.</li>
            </ol>
            
            <div style="margin-top: 0.75rem;">
              <label style="font-weight: 600; display:block; margin-bottom: 0.25rem; font-size:0.8rem;">복사할 스크립트 코드 (클릭 시 전체 복사):</label>
              <textarea class="form-control" readonly style="font-family: monospace; font-size: 0.75rem; height: 160px; background-color: var(--bg-secondary); cursor: pointer;" onclick="this.select(); document.execCommand('copy'); alert('스크립트 코드가 복사되었습니다! 구글 Apps Script 편집기에 붙여넣어 주세요.');">function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var emailOptions = { htmlBody: data.html };
    
    if (data.attachments && data.attachments.length > 0) {
      var blobs = [];
      for (var i = 0; i < data.attachments.length; i++) {
        var att = data.attachments[i];
        var decoded = Utilities.base64Decode(att.content);
        var blob = Utilities.newBlob(decoded, 'image/png', att.filename);
        blobs.push(blob);
      }
      emailOptions.attachments = blobs;
    }
    
    GmailApp.sendEmail(data.to, data.subject, '', emailOptions);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}</textarea>
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary"><i data-lucide="save"></i> 연동 설정 저장</button>
      </form>
    </div>

    <!-- 3. 데이터 백업 및 복원 -->
    <div class="card">
      <h3 class="mb-2" style="font-weight: 600; display:flex; align-items:center; gap:0.5rem;">
        <i data-lucide="database"></i> 데이터 관리 및 백업
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
        이 앱은 기기 로컬에 저장되므로, 기기 변경이나 데이터 손실 방지를 위해 주기적으로 백업을 다운로드받아 두시는 것을 권장합니다.
      </p>

      <div style="display:flex; flex-wrap:wrap; gap: 1rem;">
        <button class="btn btn-secondary" id="btn-export-db"><i data-lucide="download"></i> 백업 파일 다운로드 (.json)</button>
        <button class="btn btn-secondary" id="btn-trigger-import"><i data-lucide="upload"></i> 백업 복원하기 (.json)</button>
        <input type="file" id="input-import-db" accept=".json" style="display: none;">
      </div>
    </div>

    <!-- 4. 데모 데이터 로드 및 초기화 -->
    <div class="card" style="border-color: #fee2e2;">
      <h3 class="mb-2" style="font-weight: 600; color: #dc2626; display:flex; align-items:center; gap:0.5rem;">
        <i data-lucide="alert-octagon"></i> 시스템 초기화 및 테스트
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
        앱의 테스트를 위해 예시 데이터(가상 학생 및 수업 내역)를 삽입하거나 모든 데이터를 리셋할 수 있습니다. <b>주의:</b> 기존에 저장된 데이터는 덮어씌워집니다.
      </p>

      <div style="display:flex; flex-wrap:wrap; gap: 1rem;">
        <button class="btn btn-secondary" id="btn-seed-demo" style="border-color: var(--pastel-paid-border); color: var(--pastel-paid-text);"><i data-lucide="sparkles"></i> 예시 데이터 주입</button>
        <button class="btn btn-danger" id="btn-clear-db"><i data-lucide="trash-2"></i> 모든 데이터 초기화</button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // 1. 템플릿 저장 핸들러
  const templateForm = document.getElementById('template-settings-form');
  templateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    updateSettings({
      templates: {
        email: templateForm.emailTemplate.value,
        whatsapp: templateForm.whatsappTemplate.value,
        kakaotalk: templateForm.kakaotalkTemplate.value
      }
    });
    showToast('알림 메시지 템플릿이 저장되었습니다.');
  });

  // 2. 이메일 연동 방식 변경 핸들러
  const emailForm = document.getElementById('emailjs-settings-form');
  const providerSelect = emailForm.provider;
  const emailjsFields = document.getElementById('emailjs-fields');
  const resendFields = document.getElementById('resend-fields');
  const gmailGasFields = document.getElementById('gmail-gas-fields');

  providerSelect.addEventListener('change', () => {
    const val = providerSelect.value;
    emailjsFields.style.display = val === 'emailjs' ? 'block' : 'none';
    resendFields.style.display = val === 'resend' ? 'block' : 'none';
    gmailGasFields.style.display = val === 'gmail-gas' ? 'block' : 'none';
  });

  emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    updateSettings({
      emailService: {
        provider: emailForm.provider.value,
        emailjsServiceId: emailForm.serviceId.value,
        emailjsTemplateId: emailForm.templateId.value,
        emailjsUserId: emailForm.userId.value,
        resendApiKey: emailForm.resendApiKey.value,
        resendFromEmail: emailForm.resendFromEmail.value,
        gmailGasUrl: emailForm.gmailGasUrl.value
      }
    });
    showToast('이메일 발송 연동 설정이 저장되었습니다.');
  });

  // 3. 백업 내보내기 (Export)
  document.getElementById('btn-export-db').addEventListener('click', () => {
    const data = {
      tutor_students: JSON.parse(localStorage.getItem('tutor_students') || '[]'),
      tutor_sessions: JSON.parse(localStorage.getItem('tutor_sessions') || '[]'),
      tutor_payments: JSON.parse(localStorage.getItem('tutor_payments') || '[]'),
      tutor_settings: JSON.parse(localStorage.getItem('tutor_settings') || '{}')
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `tutor_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('백업 파일 다운로드가 시작되었습니다.');
  });

  // 4. 백업 가져오기 (Import)
  const importInput = document.getElementById('input-import-db');
  document.getElementById('btn-trigger-import').addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const importedData = JSON.parse(event.target.result);
        
        if (importedData.tutor_students) localStorage.setItem('tutor_students', JSON.stringify(importedData.tutor_students));
        if (importedData.tutor_sessions) localStorage.setItem('tutor_sessions', JSON.stringify(importedData.tutor_sessions));
        if (importedData.tutor_payments) localStorage.setItem('tutor_payments', JSON.stringify(importedData.tutor_payments));
        if (importedData.tutor_settings) localStorage.setItem('tutor_settings', JSON.stringify(importedData.tutor_settings));
        
        showToast('데이터가 성공적으로 복구되었습니다! 새로고침합니다.');
        setTimeout(() => location.reload(), 1500);
      } catch (err) {
        alert('백업 파일 형식이 올바르지 않습니다.');
      }
    };
    reader.readAsText(file);
  });

  // 5. 예시 데이터 주입
  document.getElementById('btn-seed-demo').addEventListener('click', () => {
    if (confirm('모든 기존 데이터를 삭제하고, 가상 과외 데이터를 새로 입력하시겠습니까?')) {
      seedDemoData();
      showToast('예시 데이터 주입 완료! 새로고침합니다.');
      setTimeout(() => location.reload(), 1500);
    }
  });

  // 6. 모든 데이터 삭제
  document.getElementById('btn-clear-db').addEventListener('click', () => {
    if (confirm('정말로 모든 학생, 일정, 수업료 기록을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      localStorage.clear();
      showToast('모든 데이터가 삭제되었습니다! 새로고침합니다.');
      setTimeout(() => location.reload(), 1500);
    }
  });
}
