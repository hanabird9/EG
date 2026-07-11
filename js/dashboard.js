// 대시보드 모듈
import { getStudents, getSessions, getPayments, getSettings, updateSession, updatePayment } from './db.js';
import { formatMessage, sendEmailNotification, sendWhatsAppNotification, sendKakaoTalkNotification } from './notifications.js';

export function renderDashboard(container) {
  const students = getStudents();
  const sessions = getSessions();
  const payments = getPayments();
  const settings = getSettings();
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  // 1. 오늘 예정된 세션 필터링
  const todaySessions = sessions.filter(session => {
    const sDate = new Date(session.startTime).toISOString().split('T')[0];
    return sDate === todayStr;
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  // 2. 미납 결제 필터링
  const unpaidPayments = payments.filter(p => p.status === 'unpaid').map(p => {
    const student = students.find(s => s.id === p.studentId);
    const course = student ? (student.courses || []).find(c => c.id === p.courseId) : null;
    return { ...p, student, course };
  }).filter(p => p.student && p.course); // 유효한 학생과 과목이 있는 건만

  // 3. 통계 데이터 계산
  const todayCount = todaySessions.length;
  const completedToday = todaySessions.filter(s => s.attendance !== 'pending').length;
  const unpaidCount = unpaidPayments.length;
  const totalStudents = students.length;

  container.innerHTML = `
    <div class="dashboard-summary-grid">
      <div class="summary-card">
        <div class="summary-card-title">오늘의 수업</div>
        <div class="summary-card-value">${completedToday} / ${todayCount}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">미납 수업료 건수</div>
        <div class="summary-card-value" style="color: var(--pastel-unpaid-text);">${unpaidCount}건</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">등록 학생 수</div>
        <div class="summary-card-value">${totalStudents}명</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- 오늘 수업 목록 카드 -->
      <div class="card">
        <h3 class="mb-2" style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="clock" style="color: var(--accent);"></i> 오늘의 수업 일정
        </h3>
        <div id="today-sessions-list">
          ${todaySessions.length === 0 ? `
            <div style="text-align: center; color: var(--text-tertiary); padding: 2rem 0;">
              오늘 예정된 수업 일정이 없습니다.
            </div>
          ` : todaySessions.map(session => {
            const student = students.find(s => s.id === session.studentId) || { name: '알 수 없음', courses: [] };
            const course = student.courses ? student.courses.find(c => c.id === session.courseId) : null;
            const courseName = course ? course.subject : '알 수 없음';
            const startTime = new Date(session.startTime);
            const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
            
            return `
              <div class="session-row" data-session-id="${session.id}">
                <div class="session-info">
                  <span class="session-student">${student.name} (${courseName})</span>
                  <span class="session-time"><i data-lucide="play" style="width: 12px; height: 12px; display: inline;"></i> ${timeStr} 시작</span>
                </div>
                <div class="session-actions">
                  ${session.attendance === 'pending' ? `
                    <button class="btn btn-secondary btn-icon attendance-btn" data-status="present" title="출석"><i data-lucide="check" style="color: var(--pastel-paid-text);"></i></button>
                    <button class="btn btn-secondary btn-icon attendance-btn" data-status="late" title="지각"><i data-lucide="alert-triangle" style="color: var(--pastel-unpaid-text);"></i></button>
                    <button class="btn btn-secondary btn-icon attendance-btn" data-status="absent" title="결석"><i data-lucide="x" style="color: var(--attendance-absent-text);"></i></button>
                  ` : `
                    <span class="badge badge-${session.attendance}">
                      ${session.attendance === 'present' ? '출석' : session.attendance === 'late' ? '지각' : '결석'}
                    </span>
                    <button class="btn btn-secondary btn-icon send-alert-btn" title="알림 발송"><i data-lucide="send"></i></button>
                    <button class="btn btn-secondary btn-icon reset-attendance-btn" title="출결 취소"><i data-lucide="rotate-ccw" style="width: 14px;"></i></button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 미납 수업료 카드 -->
      <div class="card">
        <h3 class="mb-2" style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="credit-card" style="color: var(--pastel-unpaid-text);"></i> 미납 수업료 현황
        </h3>
        <div id="unpaid-payments-list">
          ${unpaidPayments.length === 0 ? `
            <div style="text-align: center; color: var(--text-tertiary); padding: 2rem 0;">
              미납된 수업료가 없습니다.
            </div>
          ` : unpaidPayments.map(payment => {
            return `
              <div class="session-row" style="padding: 0.85rem 0.5rem;">
                <div class="session-info">
                  <span style="font-weight: 600;">${payment.student.name} (${payment.course.subject})</span>
                  <span style="font-size: 0.85rem; color: var(--text-secondary);">
                    청구액: <b>RM${payment.amount.toLocaleString()}</b> | 납기: ${payment.dueDate}
                  </span>
                  <span style="font-size: 0.75rem; color: var(--text-tertiary);">${payment.notes || ''}</span>
                </div>
                <div>
                  <button class="btn btn-secondary btn-icon mark-paid-btn" data-id="${payment.id}" title="수납 완료 처리">
                    <i data-lucide="check-circle" style="color: var(--pastel-paid-text);"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // 아이콘 렌더링
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 출결 처리 이벤트 핸들러 바인딩
  container.querySelectorAll('.attendance-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('.session-row');
      const sessionId = row.dataset.sessionId;
      const status = btn.dataset.status;
      
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.attendance = status;
        updateSession(sessionId, session);
        
        // 화면 리프레시
        renderDashboard(container);
        
        // 바로 알림 발송 팝업 모달 실행
        const student = students.find(s => s.id === session.studentId);
        openNotificationModal(student, session, settings);
      }
    });
  });

  // 출결 취소 이벤트
  container.querySelectorAll('.reset-attendance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.session-row');
      const sessionId = row.dataset.sessionId;
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.attendance = 'pending';
        session.attendanceNotified = false;
        updateSession(sessionId, session);
        renderDashboard(container);
      }
    });
  });

  // 개별 알림 재전송 버튼 이벤트
  container.querySelectorAll('.send-alert-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.session-row');
      const sessionId = row.dataset.sessionId;
      const session = sessions.find(s => s.id === sessionId);
      const student = students.find(s => s.id === session.studentId);
      openNotificationModal(student, session, settings);
    });
  });

  // 수납 완료 버튼 이벤트
  container.querySelectorAll('.mark-paid-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.target.closest('.mark-paid-btn');
      const paymentId = button.dataset.id;
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        payment.status = 'paid';
        payment.paidDate = new Date().toISOString().split('T')[0];
        updatePayment(paymentId, payment);
        
        // 토스트 메시지 출력
        showToast('수납 완료 처리가 완료되었습니다.');
        
        // 화면 리로드
        renderDashboard(container);
      }
    });
  });
}

// 출결 사항 알림 발송 팝업 모달
export function openNotificationModal(student, session, settings) {
  const modalOverlay = document.getElementById('common-modal');
  const modalContent = modalOverlay.querySelector('.modal-content');
  
  const emailMsg = formatMessage(settings.templates?.email, student, session);
  const whatsappMsg = formatMessage(settings.templates?.whatsapp, student, session);
  const kakaotalkMsg = formatMessage(settings.templates?.kakaotalk, student, session);

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>${student.name} 학생 출결 알림 발송</h3>
      <button class="modal-close-btn" id="close-modal">&times;</button>
    </div>
    <div class="modal-body">
      <p class="mb-2" style="font-size: 0.9rem; color: var(--text-secondary);">
        출결 처리가 되었습니다. 아래 전송 수단을 선택하여 학부모님께 출결 통보 메시지를 전송하세요.
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        
        <!-- 이메일 전송 섹션 -->
        <div style="border: 1px solid var(--border); padding: 1rem; border-radius: 0.5rem; background-color: var(--bg-tertiary);">
          <div class="flex-between">
            <span style="font-weight: 600; display: flex; align-items: center; gap: 0.25rem;"><i data-lucide="mail" style="color: #ea4335; width:16px;"></i> 이메일 전송</span>
            <span style="font-size:0.8rem; color: var(--text-secondary);">${student.parentEmail || '등록된 이메일 없음'}</span>
          </div>
          <div class="mt-1" style="font-size: 0.8rem; color: var(--text-tertiary); max-height: 50px; overflow-y: auto; background: var(--bg-secondary); padding: 0.5rem; border-radius: 0.25rem; white-space: pre-line;">
            ${emailMsg}
          </div>
          <button class="btn btn-primary w-full mt-1 btn-sm" id="btn-send-email" ${!student.parentEmail ? 'disabled' : ''}>
            이메일 발송
          </button>
        </div>

        <!-- WhatsApp 전송 섹션 -->
        <div style="border: 1px solid var(--border); padding: 1rem; border-radius: 0.5rem; background-color: var(--bg-tertiary);">
          <div class="flex-between">
            <span style="font-weight: 600; display: flex; align-items: center; gap: 0.25rem;"><i data-lucide="message-square" style="color: #25d366; width:16px;"></i> WhatsApp 전송</span>
            <span style="font-size:0.8rem; color: var(--text-secondary);">${student.parentPhone || '등록된 번호 없음'}</span>
          </div>
          <div class="mt-1" style="font-size: 0.8rem; color: var(--text-tertiary); max-height: 50px; overflow-y: auto; background: var(--bg-secondary); padding: 0.5rem; border-radius: 0.25rem; white-space: pre-line;">
            ${whatsappMsg}
          </div>
          <button class="btn btn-primary w-full mt-1" id="btn-send-whatsapp" ${!student.parentPhone ? 'disabled' : ''} style="background-color: #25d366; color: white;">
            WhatsApp 대화방 연결
          </button>
        </div>

        <!-- 카카오톡 전송 섹션 -->
        <div style="border: 1px solid var(--border); padding: 1rem; border-radius: 0.5rem; background-color: var(--bg-tertiary);">
          <div class="flex-between">
            <span style="font-weight: 600; display: flex; align-items: center; gap: 0.25rem;"><i data-lucide="message-circle" style="color: #fef01b; width:16px;"></i> 카카오톡 전송</span>
            <span style="font-size:0.8rem; color: var(--text-secondary);">${student.parentKakaoId ? '@' + student.parentKakaoId : '등록된 카톡 ID 없음'}</span>
          </div>
          <div class="mt-1" style="font-size: 0.8rem; color: var(--text-tertiary); max-height: 50px; overflow-y: auto; background: var(--bg-secondary); padding: 0.5rem; border-radius: 0.25rem; white-space: pre-line;">
            ${kakaotalkMsg}
          </div>
          <button class="btn btn-primary w-full mt-1" id="btn-send-kakaotalk" style="background-color: #fef01b; color: #3c1e1e;">
            텍스트 복사 & 카카오톡 열기
          </button>
        </div>

      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="close-modal-footer">닫기</button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  modalOverlay.classList.add('active');

  const closeModal = () => {
    modalOverlay.classList.remove('active');
  };

  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-footer').addEventListener('click', closeModal);

  // 이메일 발송 클릭
  const emailBtn = document.getElementById('btn-send-email');
  if (emailBtn && student.parentEmail) {
    emailBtn.addEventListener('click', async () => {
      emailBtn.innerText = '발송 중...';
      emailBtn.disabled = true;
      const res = await sendEmailNotification(student, session, settings);
      
      session.attendanceNotified = true;
      updateSession(session.id, session);
      
      if (res.method === 'emailjs' || res.method === 'resend' || res.method === 'gmail-gas') {
        showToast('이메일 자동 발송 완료!');
      } else {
        showToast('메일 전송 창이 실행되었습니다.');
      }
      closeModal();
      // 대시보드 강제 리프레시
      const dashboardTab = document.getElementById('tab-dashboard');
      if (dashboardTab && dashboardTab.classList.contains('active')) {
        renderDashboard(document.getElementById('dashboard-view'));
      }
    });
  }

  // WhatsApp 발송 클릭
  const whatsappBtn = document.getElementById('btn-send-whatsapp');
  if (whatsappBtn && student.parentPhone) {
    whatsappBtn.addEventListener('click', () => {
      sendWhatsAppNotification(student, session, settings);
      session.attendanceNotified = true;
      updateSession(session.id, session);
      showToast('WhatsApp 전송 창이 실행되었습니다.');
      closeModal();
      // 대시보드 리프레시
      const dashboardTab = document.getElementById('tab-dashboard');
      if (dashboardTab && dashboardTab.classList.contains('active')) {
        renderDashboard(document.getElementById('dashboard-view'));
      }
    });
  }

  // 카카오톡 발송 클릭
  const kakaotalkBtn = document.getElementById('btn-send-kakaotalk');
  kakaotalkBtn.addEventListener('click', async () => {
    const res = await sendKakaoTalkNotification(student, session, settings);
    if (res.success) {
      session.attendanceNotified = true;
      updateSession(session.id, session);
      showToast('텍스트가 복사되었습니다! 카톡 대화창에 붙여넣기 하세요.');
      closeModal();
      
      // 모바일 등 환경에서 카카오톡 열기 시도
      window.open('kakaotalk://', '_self');
      
      // 대시보드 리프레시
      const dashboardTab = document.getElementById('tab-dashboard');
      if (dashboardTab && dashboardTab.classList.contains('active')) {
        renderDashboard(document.getElementById('dashboard-view'));
      }
    } else {
      showToast('텍스트 복사 실패: ' + res.error);
    }
  });
}

// 전역 토스트 팝업 띄우기 함수
export function showToast(message) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
