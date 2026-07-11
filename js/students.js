// 학생 관리 모듈 (B안: 1학생 - N과목 매칭)
import { getStudents, getSessions, getPayments, addStudent, updateStudent, deleteStudent, addCourse, updateCourse, deleteCourse, addPayment, updatePayment, deletePayment } from './db.js';
import { showToast } from './dashboard.js';

let activeStudentId = null; // 상세 페이지를 볼 학생 ID

export function renderStudents(container) {
  if (activeStudentId) {
    renderStudentDetail(container, activeStudentId);
  } else {
    renderStudentList(container);
  }
}

// 1. 학생 목록 화면
function renderStudentList(container) {
  const students = getStudents();
  
  container.innerHTML = `
    <div class="flex-between mb-2">
      <h2 style="font-weight: 700;">학생 관리</h2>
      <button class="btn btn-primary" id="btn-add-student"><i data-lucide="user-plus"></i> 학생 신규 등록</button>
    </div>
    
    ${students.length === 0 ? `
      <div class="card" style="text-align: center; color: var(--text-tertiary); padding: 4rem 2rem;">
        <i data-lucide="users" style="width: 48px; height: 48px; margin: 0 auto 1rem; color: var(--text-tertiary);"></i>
        <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.5rem;">등록된 학생이 없습니다.</p>
        <p style="font-size: 0.9rem; color: var(--text-tertiary); margin-bottom: 1.5rem;">새로운 학생을 등록해 과목 및 수업료 관리를 시작하세요.</p>
        <button class="btn btn-primary" id="btn-add-student-empty">학생 등록하기</button>
      </div>
    ` : `
      <div class="grid-3" id="students-grid">
        ${students.map(student => {
          const coursesList = student.courses && student.courses.length > 0 ? 
            student.courses.map(c => `<span class="badge" style="background-color: var(--bg-tertiary); color: var(--text-primary); font-size: 0.75rem; border: 1px solid var(--border);">${c.subject}</span>`).join(' ') : 
            `<span style="color: var(--text-tertiary); font-size: 0.8rem;">수강 중인 과목 없음</span>`;

          return `
            <div class="card student-card" data-student-id="${student.id}" style="cursor: pointer; display:flex; flex-direction:column; justify-content:space-between; min-height: 220px;">
              <div>
                <div class="flex-between" style="border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
                  <h3 style="font-weight: 600; font-size: 1.15rem;">${student.name}</h3>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem;">
                  <span><b>학부모:</b> ${student.parentName || '-'}</span>
                  <span><b>연락처:</b> ${student.parentPhone || '-'}</span>
                </div>
                <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.25rem;">
                  ${coursesList}
                </div>
              </div>
              <div class="mt-2 text-right">
                <button class="btn btn-secondary w-full btn-student-detail" data-student-id="${student.id}">상세 관리</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;

  if (window.lucide) window.lucide.createIcons();

  // 이벤트 연결
  const addBtn = document.getElementById('btn-add-student');
  if (addBtn) addBtn.addEventListener('click', () => openStudentFormModal());
  
  const addEmptyBtn = document.getElementById('btn-add-student-empty');
  if (addEmptyBtn) addEmptyBtn.addEventListener('click', () => openStudentFormModal());

  container.querySelectorAll('.btn-student-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeStudentId = btn.dataset.studentId;
      renderStudents(container);
    });
  });

  container.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', () => {
      activeStudentId = card.dataset.studentId;
      renderStudents(container);
    });
  });
}

// 2. 학생 상세 관리 화면
function renderStudentDetail(container, studentId) {
  const students = getStudents();
  const student = students.find(s => s.id === studentId);
  
  if (!student) {
    activeStudentId = null;
    renderStudentList(container);
    return;
  }

  const courses = student.courses || [];
  const sessions = getSessions().filter(s => s.studentId === studentId).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const payments = getPayments().filter(p => p.studentId === studentId).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

  container.innerHTML = `
    <div class="mb-2">
      <button class="btn btn-secondary" id="btn-back-to-list" style="margin-bottom: 1rem;"><i data-lucide="arrow-left"></i> 목록으로</button>
      
      <div class="grid-3" style="grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start;">
        
        <!-- 왼쪽: 학생 프로필 & 수강 과목 관리 카드 -->
        <div>
          <!-- 프로필 카드 -->
          <div class="card" style="margin-bottom: 1rem;">
            <div style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem; text-align: center;">
              <div style="width: 50px; height: 50px; border-radius: 50%; background-color: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 700; margin: 0 auto 0.75rem;">
                ${student.name.charAt(0)}
              </div>
              <h3 style="font-weight: 600; font-size: 1.25rem; margin-bottom: 0.25rem;">${student.name}</h3>
              <span style="font-size: 0.85rem; color: var(--text-secondary);">수강 중인 과목: ${courses.length}개</span>
            </div>

            <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.25rem;">
              <div>
                <span style="font-weight: 600; color: var(--text-secondary); display:block; font-size:0.75rem;">학부모 이름</span>
                <span>${student.parentName || '-'}</span>
              </div>
              <div>
                <span style="font-weight: 600; color: var(--text-secondary); display:block; font-size:0.75rem;">학부모 연락처</span>
                <span>${student.parentPhone || '-'}</span>
              </div>
              <div>
                <span style="font-weight: 600; color: var(--text-secondary); display:block; font-size:0.75rem;">학부모 이메일</span>
                <span>${student.parentEmail || '-'}</span>
              </div>
              <div>
                <span style="font-weight: 600; color: var(--text-secondary); display:block; font-size:0.75rem;">학부모 카카오톡 ID</span>
                <span>${student.parentKakaoId ? '@' + student.parentKakaoId : '-'}</span>
              </div>
              <hr style="border: none; border-top: 1px solid var(--border);">
              <div>
                <span style="font-weight: 600; color: var(--text-secondary); display:block; font-size:0.75rem;">학생 연락처</span>
                <span>${student.studentPhone || '-'}</span>
              </div>
              <div>
                <span style="font-weight: 600; color: var(--text-secondary); display:block; font-size:0.75rem;">학생 카카오톡 ID</span>
                <span>${student.studentKakaoId ? '@' + student.studentKakaoId : '-'}</span>
              </div>
              ${student.notes ? `
                <hr style="border: none; border-top: 1px solid var(--border);">
                <div>
                  <span style="font-weight: 600; color: var(--text-secondary); display:block; font-size:0.75rem;">학생 기본 메모</span>
                  <span style="font-size: 0.8rem; background: var(--bg-tertiary); padding: 0.4rem; border-radius: 0.25rem; display: block; white-space: pre-wrap;">${student.notes}</span>
                </div>
              ` : ''}
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary flex-1" id="btn-edit-student" style="flex:1;"><i data-lucide="edit"></i> 프로필 수정</button>
              <button class="btn btn-danger btn-icon" id="btn-delete-student" title="학생 삭제"><i data-lucide="trash-2"></i></button>
            </div>
          </div>

          <!-- 수강 과목 관리 카드 -->
          <div class="card">
            <div class="flex-between mb-2">
              <h4 style="font-weight: 600; font-size: 0.95rem;">수강 과목 목록</h4>
              <button class="btn btn-secondary btn-icon" id="btn-add-course" title="과목 추가 등록" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">
                <i data-lucide="plus"></i> 과목 추가
              </button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${courses.length === 0 ? `
                <p style="text-align: center; color: var(--text-tertiary); font-size: 0.8rem; padding: 1rem 0;">등록된 수강 과목이 없습니다. 과목을 추가해 주세요.</p>
              ` : courses.map(course => {
                return `
                  <div style="border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.75rem; background-color: var(--bg-tertiary);">
                    <div class="flex-between" style="margin-bottom: 0.25rem;">
                      <span style="font-weight: 600; font-size: 0.9rem; color: var(--accent);">${course.subject}</span>
                      <div style="display: flex; gap: 0.25rem;">
                        <button class="btn btn-secondary btn-icon btn-edit-course" data-course-id="${course.id}" style="padding: 0.25rem;" title="과목 정보 수정"><i data-lucide="edit-3" style="width: 12px; height: 12px;"></i></button>
                        <button class="btn btn-danger btn-icon btn-delete-course" data-course-id="${course.id}" style="padding: 0.25rem;" title="과목 수강 철회"><i data-lucide="x" style="width: 12px; height: 12px;"></i></button>
                      </div>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); display:flex; flex-direction:column; gap:0.1rem;">
                      <span>수업료: <b>RM${course.tuitionFee.toLocaleString()}</b></span>
                      <span>주기: ${course.tuitionCycle === 'monthly' ? '매월 ' + course.tuitionCycleValue + '일' : course.tuitionCycleValue + '회 단위 결제'}</span>
                      ${course.notes ? `<span style="color:var(--text-tertiary); margin-top:0.15rem; font-style:italic;">"${course.notes}"</span>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- 오른쪽: 세부 탭 (일정 / 수업료) -->
        <div>
          <!-- 상세 탭 헤더 -->
          <div class="card" style="padding: 0.5rem; display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <button class="btn btn-secondary detail-tab-btn active" data-tab="tab-student-schedule" style="flex: 1; border: none; background: none; font-size: 0.85rem;">
              <i data-lucide="calendar"></i> 수업 일정 (${sessions.length})
            </button>
            <button class="btn btn-secondary detail-tab-btn" data-tab="tab-student-tuition" style="flex: 1; border: none; background: none; font-size: 0.85rem;">
              <i data-lucide="credit-card"></i> 수업료 (${payments.length})
            </button>
            <button class="btn btn-secondary detail-tab-btn" data-tab="tab-student-report" style="flex: 1; border: none; background: none; font-size: 0.85rem;">
              <i data-lucide="bar-chart-2"></i> 출결 리포트
            </button>
          </div>

          <!-- 탭 내용 1: 수업 일정 목록 -->
          <div id="tab-student-schedule" class="detail-tab-content active-tab">
            <div class="card">
              <div class="flex-between mb-2">
                <h3 style="font-weight: 600;">과외 수업 기록</h3>
                <!-- 과목별 필터링 옵션 -->
                <select class="form-control" id="filter-schedule-course" style="width: auto; padding: 0.35rem 0.5rem; font-size: 0.85rem;">
                  <option value="all">전체 과목</option>
                  ${courses.map(c => `<option value="${c.id}">${c.subject}</option>`).join('')}
                </select>
              </div>
              
              <div id="student-schedule-list" style="display: flex; flex-direction: column; max-height: 500px; overflow-y: auto;">
                <!-- 렌더링 함수가 별도로 갱신함 -->
              </div>
            </div>
          </div>

          <!-- 탭 내용 2: 수업료 결제 내역 관리 -->
          <div id="tab-student-tuition" class="detail-tab-content" style="display: none;">
            <div class="card">
              <div class="flex-between mb-2">
                <h3 style="font-weight: 600;">수업료 청구 및 납부 목록</h3>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <select class="form-control" id="filter-payment-course" style="width: auto; padding: 0.35rem 0.5rem; font-size: 0.85rem;">
                    <option value="all">전체 과목</option>
                    ${courses.map(c => `<option value="${c.id}">${c.subject}</option>`).join('')}
                  </select>
                  <button class="btn btn-secondary btn-icon" id="btn-add-payment" title="청구서 새로 발행" style="padding: 0.35rem 0.6rem;"><i data-lucide="plus"></i> 청구 추가</button>
                </div>
              </div>

              <div id="student-payment-list" style="display: flex; flex-direction: column; max-height: 500px; overflow-y: auto;">
                <!-- 렌더링 함수가 별도로 갱신함 -->
              </div>
            </div>
          </div>

          <!-- 탭 내용 3: 출결 리포트 -->
          <div id="tab-student-report" class="detail-tab-content" style="display: none;">
            <div class="card">
              <div class="flex-between mb-2">
                <h3 style="font-weight: 600;">출결 통계 리포트</h3>
              </div>
              
              <!-- 필터 영역 -->
              <div class="grid-3" style="gap: 0.75rem; margin-bottom: 1rem; grid-template-columns: 1fr 1fr 1fr;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.8rem;">과목 필터</label>
                  <select class="form-control" id="report-filter-course" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;">
                    <option value="all">전체 과목</option>
                    ${courses.map(c => `<option value="${c.id}">${c.subject}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.8rem;">기간 설정</label>
                  <select class="form-control" id="report-filter-range" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;">
                    <option value="week">최근 1주일</option>
                    <option value="month" selected>최근 1개월</option>
                    <option value="3months">최근 3개월</option>
                    <option value="custom">기간 직접 지정</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.8rem;"> &nbsp; </label>
                  <button class="btn btn-secondary w-full" id="btn-generate-report" style="padding: 0.4rem; font-size: 0.85rem;"><i data-lucide="rotate-cw" style="width: 14px; height: 14px;"></i> 조회</button>
                </div>
              </div>
              
              <!-- 직접 지정 날짜 선택 (기본 숨김) -->
              <div class="grid-2" id="report-custom-dates" style="display: none; gap: 0.75rem; margin-bottom: 1rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.8rem;">시작일</label>
                  <input type="date" class="form-control" id="report-start-date" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.8rem;">종료일</label>
                  <input type="date" class="form-control" id="report-end-date" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;">
                </div>
              </div>

              <hr style="border: none; border-top: 1px solid var(--border); margin: 1rem 0;">

              <!-- 리포트 상세 출력 영역 -->
              <div id="report-results" style="display: none;">
                <div class="grid-2" style="grid-template-columns: 1fr 1fr; gap: 1rem; align-items: center; margin-bottom: 1.5rem;">
                  <!-- 요약 통계 -->
                  <div>
                    <h4 style="font-weight:600; margin-bottom:0.75rem; font-size:0.95rem;">출결 통계 요약</h4>
                    <table class="table" style="font-size: 0.85rem; width: 100%;">
                      <tr><td>총 수업 일수</td><td id="stat-total" style="text-align:right; font-weight:600;">-</td></tr>
                      <tr><td>출석 횟수</td><td id="stat-present" style="text-align:right; color: var(--pastel-paid-text); font-weight:600;">-</td></tr>
                      <tr><td>지각 횟수</td><td id="stat-late" style="text-align:right; color: var(--pastel-unpaid-text); font-weight:600;">-</td></tr>
                      <tr><td>결석 횟수</td><td id="stat-absent" style="text-align:right; color: #ef4444; font-weight:600;">-</td></tr>
                      <tr style="border-top: 2px solid var(--border); font-weight: 700;">
                        <td>출석률 (출석+지각)</td>
                        <td id="stat-rate" style="text-align:right; color: var(--accent); font-size:1rem;">-</td>
                      </tr>
                    </table>
                  </div>
                  <!-- 그래프 컨테이너 -->
                  <div style="text-align: center; max-height: 200px; display: flex; justify-content: center; align-items: center;">
                    <canvas id="report-chart" width="180" height="180" style="max-width: 180px; max-height: 180px;"></canvas>
                  </div>
                </div>

                <!-- 이메일 발송 버튼 -->
                <button class="btn btn-primary w-full" id="btn-send-email-report">
                  <i data-lucide="send"></i> 학부모에게 이메일 리포트 발송
                </button>
              </div>

              <div id="report-empty" style="text-align: center; color: var(--text-tertiary); padding: 3rem 0; font-size: 0.9rem;">
                조건을 선택하고 [조회] 버튼을 클릭해 주세요.
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // 리스트 갱신 헬퍼 함수들
  const updateScheduleList = () => {
    const filterCourseId = document.getElementById('filter-schedule-course').value;
    const listContainer = document.getElementById('student-schedule-list');
    
    const filteredSessions = filterCourseId === 'all' ? 
      sessions : 
      sessions.filter(s => s.courseId === filterCourseId);

    listContainer.innerHTML = filteredSessions.length === 0 ? `
      <p style="text-align: center; color: var(--text-tertiary); padding: 3rem 0; font-size: 0.9rem;">등록된 수업 일정이 없습니다.</p>
    ` : filteredSessions.map(session => {
      const sDate = new Date(session.startTime);
      const dateStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
      const courseSubject = courses.find(c => c.id === session.courseId)?.subject || '알수없음';
      
      let paymentStatusBadge = '';
      if (session.paymentId) {
        const pay = getPayments().find(p => p.id === session.paymentId);
        if (pay) {
          paymentStatusBadge = pay.status === 'paid' ? 
            `<span class="payment-badge payment-badge-paid" style="margin-left:0.5rem;">수납 완료</span>` : 
            `<span class="payment-badge payment-badge-unpaid" style="margin-left:0.5rem;">미납</span>`;
        }
      } else {
        paymentStatusBadge = `<span class="payment-badge payment-badge-unbilled" style="margin-left:0.5rem;">미청구</span>`;
      }

      return `
        <div class="session-row" style="padding: 1rem 0.5rem;">
          <div class="session-info">
            <span style="font-weight:600; display:flex; align-items:center; gap: 0.25rem;">
              <span style="color: var(--accent); font-size: 0.85rem; border: 1px solid var(--border); padding: 0.1rem 0.3rem; border-radius: 0.25rem;">${courseSubject}</span>
              ${dateStr} (${timeStr}) ${paymentStatusBadge}
            </span>
            <span style="font-size:0.85rem; color: var(--text-secondary); margin-top:0.25rem;">
              ${session.notes || '작성된 코멘트 없음'}
            </span>
          </div>
          <div>
            <span class="badge badge-${session.attendance}">
              ${session.attendance === 'present' ? '출석' : session.attendance === 'late' ? '지각' : session.attendance === 'absent' ? '결석' : '대기'}
            </span>
          </div>
        </div>
      `;
    }).join('');
  };

  const updatePaymentList = () => {
    const filterCourseId = document.getElementById('filter-payment-course').value;
    const listContainer = document.getElementById('student-payment-list');
    
    const filteredPayments = filterCourseId === 'all' ? 
      payments : 
      payments.filter(p => p.courseId === filterCourseId);

    listContainer.innerHTML = filteredPayments.length === 0 ? `
      <p style="text-align: center; color: var(--text-tertiary); padding: 3rem 0; font-size: 0.9rem;">청구 내역이 없습니다.</p>
    ` : filteredPayments.map(payment => {
      const courseSubject = courses.find(c => c.id === payment.courseId)?.subject || '알수없음';
      
      return `
        <div class="session-row" style="padding: 1rem 0.5rem;">
          <div class="session-info">
            <span style="font-weight: 600; font-size:1.05rem; display:flex; align-items:center; gap:0.5rem;">
              RM${payment.amount.toLocaleString()}
              <span class="badge" style="background-color: var(--bg-tertiary); color: var(--accent); font-size:0.75rem; font-weight:500;">${courseSubject}</span>
            </span>
            <span style="font-size: 0.85rem; color: var(--text-secondary); margin-top:0.25rem;">
              설명: ${payment.notes || '일반 과외비'} | 납기일: ${payment.dueDate}
            </span>
            ${payment.paidDate ? `<span style="font-size: 0.8rem; color: var(--pastel-paid-text); font-weight:500;">수납일: ${payment.paidDate}</span>` : ''}
          </div>
          <div class="session-actions">
            ${payment.status === 'unpaid' ? `
              <button class="btn btn-secondary btn-icon btn-mark-paid-detail" data-id="${payment.id}" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;">
                <i data-lucide="check" style="color: var(--pastel-paid-text); width: 14px; height: 14px;"></i> 수납 완료
              </button>
              <button class="btn btn-secondary btn-icon btn-delete-payment" data-id="${payment.id}"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
            ` : `
              <span class="payment-badge payment-badge-paid">결제 완료</span>
              <button class="btn btn-secondary btn-icon btn-delete-payment" data-id="${payment.id}"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
            `}
          </div>
        </div>
      `;
    }).join('');
    
    if (window.lucide) window.lucide.createIcons();

    // 청구서 수납처리 바인딩
    listContainer.querySelectorAll('.btn-mark-paid-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const payment = payments.find(p => p.id === id);
        if (payment) {
          payment.status = 'paid';
          payment.paidDate = new Date().toISOString().split('T')[0];
          updatePayment(id, payment);
          showToast('수납 완료 처리가 기록되었습니다.');
          
          // 리스트만 갱신하는 것이 아니라 상세 데이터를 새로 가져와서 리로드
          renderStudentDetail(container, studentId);
        }
      });
    });

    // 청구서 삭제 바인딩
    listContainer.querySelectorAll('.btn-delete-payment').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('이 결제(청구) 건을 삭제하시겠습니까?\n연결된 모든 세션의 청구 연동이 헤제됩니다.')) {
          deletePayment(id);
          showToast('결제 청구가 삭제되었습니다.');
          renderStudentDetail(container, studentId);
        }
      });
    });
  };

  // 초기 렌더링
  updateScheduleList();
  updatePaymentList();

  // 필터 작동 바인딩
  document.getElementById('filter-schedule-course').addEventListener('change', updateScheduleList);
  document.getElementById('filter-payment-course').addEventListener('change', updatePaymentList);

  // 뒤로 가기
  document.getElementById('btn-back-to-list').addEventListener('click', () => {
    activeStudentId = null;
    renderStudentList(container);
  });

  // 학생 수정
  document.getElementById('btn-edit-student').addEventListener('click', () => {
    openStudentFormModal(student);
  });

  // 학생 삭제
  document.getElementById('btn-delete-student').addEventListener('click', () => {
    if (confirm(`${student.name} 학생을 정말 삭제하시겠습니까?\n삭제 시 해당 학생의 수업 및 결제 이력이 모두 지워집니다.`)) {
      deleteStudent(student.id);
      showToast('학생 정보가 완전히 삭제되었습니다.');
      activeStudentId = null;
      renderStudentList(container);
    }
  });

  // 과목 신규 추가 버튼 바인딩
  document.getElementById('btn-add-course').addEventListener('click', () => {
    openCourseFormModal(studentId);
  });

  // 과목 수정 버튼 바인딩
  container.querySelectorAll('.btn-edit-course').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.dataset.courseId;
      const course = courses.find(c => c.id === courseId);
      openCourseFormModal(studentId, course);
    });
  });

  // 과목 수강철회/삭제 버튼 바인딩
  container.querySelectorAll('.btn-delete-course').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.dataset.courseId;
      const courseSubject = courses.find(c => c.id === courseId)?.subject || '';
      if (confirm(`[${courseSubject}] 과목 수강을 철회하시겠습니까?\n철회 시 해당 과목의 모든 일정 및 결제 내역이 삭제됩니다.`)) {
        deleteCourse(studentId, courseId);
        showToast('과목이 정상적으로 철회되었습니다.');
        renderStudentDetail(container, studentId);
      }
    });
  });

  // 탭 전환 이벤트
  const tabBtns = container.querySelectorAll('.detail-tab-btn');
  const tabContents = {
    'tab-student-schedule': document.getElementById('tab-student-schedule'),
    'tab-student-tuition': document.getElementById('tab-student-tuition'),
    'tab-student-report': document.getElementById('tab-student-report')
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      Object.keys(tabContents).forEach(key => {
        if (key === targetTab) {
          tabContents[key].style.display = 'block';
          if (targetTab === 'tab-student-report') {
            // 리포트 탭 진입 시 초기화
            document.getElementById('report-results').style.display = 'none';
            document.getElementById('report-empty').style.display = 'block';
            document.getElementById('report-empty').innerText = '조건을 선택하고 [조회] 버튼을 클릭해 주세요.';
          }
        } else {
          tabContents[key].style.display = 'none';
        }
      });
    });
  });

  // 신규 수업료 청구서 추가 버튼 바인딩
  document.getElementById('btn-add-payment').addEventListener('click', () => {
    if (courses.length === 0) {
      showToast('청구할 수 있는 과목이 없습니다. 먼저 과목을 추가해 주세요.');
      return;
    }
    openAddPaymentModal(student);
  });

  // --- 출결 리포트 통계 조회 및 이메일 발송 바인딩 ---
  const reportRangeSelect = document.getElementById('report-filter-range');
  const customDatesDiv = document.getElementById('report-custom-dates');
  
  if (reportRangeSelect && customDatesDiv) {
    reportRangeSelect.addEventListener('change', () => {
      customDatesDiv.style.display = reportRangeSelect.value === 'custom' ? 'flex' : 'none';
    });
  }

  let chartInstance = null;

  const generateBtn = document.getElementById('btn-generate-report');
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      const courseId = document.getElementById('report-filter-course').value;
      const range = reportRangeSelect.value;
      
      let startDate, endDate;
      const today = new Date();
      
      if (range === 'week') {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0,0,0,0);
        endDate = new Date(today);
        endDate.setHours(23,59,59,999);
      } else if (range === 'month') {
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        startDate.setHours(0,0,0,0);
        endDate = new Date(today);
        endDate.setHours(23,59,59,999);
      } else if (range === '3months') {
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        startDate.setHours(0,0,0,0);
        endDate = new Date(today);
        endDate.setHours(23,59,59,999);
      } else {
        const startStr = document.getElementById('report-start-date').value;
        const endStr = document.getElementById('report-end-date').value;
        if (!startStr || !endStr) {
          alert('시작일과 종료일을 지정해 주세요.');
          return;
        }
        startDate = new Date(startStr + 'T00:00:00');
        endDate = new Date(endStr + 'T23:59:59');
      }
      
      // 해당 날짜 범위에 해당하는 수업 일정 필터링
      let reportSessions = sessions.filter(s => {
        const sDate = new Date(s.startTime);
        return sDate >= startDate && sDate <= endDate;
      });
      
      if (courseId !== 'all') {
        reportSessions = reportSessions.filter(s => s.courseId === courseId);
      }
      
      if (reportSessions.length === 0) {
        document.getElementById('report-results').style.display = 'none';
        document.getElementById('report-empty').style.display = 'block';
        document.getElementById('report-empty').innerText = '선택한 조건의 기간 내 과외 수업 일정이 존재하지 않습니다.';
        return;
      }
      
      document.getElementById('report-empty').style.display = 'none';
      document.getElementById('report-results').style.display = 'block';
      
      // 통계 값 추출
      const present = reportSessions.filter(s => s.attendance === 'present').length;
      const late = reportSessions.filter(s => s.attendance === 'late').length;
      const absent = reportSessions.filter(s => s.attendance === 'absent').length;
      const total = reportSessions.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
      
      document.getElementById('stat-total').innerText = `${total}회`;
      document.getElementById('stat-present').innerText = `${present}회`;
      document.getElementById('stat-late').innerText = `${late}회`;
      document.getElementById('stat-absent').innerText = `${absent}회`;
      document.getElementById('stat-rate').innerText = `${rate}%`;
      
      // 과목별 데이터 그룹화 (누적 막대 그래프용)
      const chartLabels = [];
      const presentData = [];
      const lateData = [];
      const absentData = [];

      if (courseId === 'all') {
        courses.forEach(c => {
          const courseSessions = reportSessions.filter(s => s.courseId === c.id);
          if (courseSessions.length > 0) {
            chartLabels.push(c.subject);
            presentData.push(courseSessions.filter(s => s.attendance === 'present').length);
            lateData.push(courseSessions.filter(s => s.attendance === 'late').length);
            absentData.push(courseSessions.filter(s => s.attendance === 'absent').length);
          }
        });
        
        if (chartLabels.length === 0) {
          chartLabels.push('수업 없음');
          presentData.push(0);
          lateData.push(0);
          absentData.push(0);
        }
      } else {
        const selectedCourse = courses.find(c => c.id === courseId);
        const subjectName = selectedCourse ? selectedCourse.subject : '과외';
        chartLabels.push(subjectName);
        presentData.push(present);
        lateData.push(late);
        absentData.push(absent);
      }

      // Chart.js 그래프 생성 (누적 막대 그래프)
      const canvasEl = document.getElementById('report-chart');
      if (canvasEl) {
        const ctx = canvasEl.getContext('2d');
        if (chartInstance) {
          chartInstance.destroy();
        }
        
        if (window.Chart) {
          chartInstance = new window.Chart(ctx, {
            type: 'bar',
            data: {
              labels: chartLabels,
              datasets: [
                {
                  label: '출석',
                  data: presentData,
                  backgroundColor: '#10b981',
                  borderRadius: 4
                },
                {
                  label: '지각',
                  data: lateData,
                  backgroundColor: '#f59e0b',
                  borderRadius: 4
                },
                {
                  label: '결석',
                  data: absentData,
                  backgroundColor: '#ef4444',
                  borderRadius: 4
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false }
                },
                y: {
                  stacked: true,
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    precision: 0
                  }
                }
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'bottom',
                  labels: {
                    boxWidth: 10,
                    font: { size: 10 }
                  }
                }
              }
            }
          });
        }
      }
    });
  }  // 이메일 발송 이벤트
  const sendReportBtn = document.getElementById('btn-send-email-report');
  if (sendReportBtn) {
    sendReportBtn.addEventListener('click', async () => {
      const settings = getSettings();
      const provider = settings.emailService?.provider || 'mailto';
      
      if (!student.parentEmail) {
        alert('학부모의 이메일 주소가 비어있습니다. 학생 프로필 수정에서 이메일을 먼저 등록해 주세요.');
        return;
      }
      
      const courseId = document.getElementById('report-filter-course').value;
      const courseName = courseId === 'all' ? '전체 과목' : courses.find(c => c.id === courseId)?.subject || '과외';
      
      const total = document.getElementById('stat-total').innerText;
      const present = document.getElementById('stat-present').innerText;
      const late = document.getElementById('stat-late').innerText;
      const absent = document.getElementById('stat-absent').innerText;
      const rate = document.getElementById('stat-rate').innerText;
      
      const range = reportRangeSelect.value;
      let rangeText = '';
      if (range === 'week') rangeText = '최근 1주일';
      else if (range === 'month') rangeText = '최근 1개월';
      else if (range === '3months') rangeText = '최근 3개월';
      else {
        const startStr = document.getElementById('report-start-date').value;
        const endStr = document.getElementById('report-end-date').value;
        rangeText = `${startStr} ~ ${endStr}`;
      }

      const subject = `[출결 리포트] ${student.name} 학생의 과외 보고서 (${courseName})`;
      const textMessage = `안녕하세요, ${student.parentName || '학부모님'}.\n${student.name} 학생의 출결 통계 리포트를 안내해 드립니다.\n\n[출결 요약]\n- 조회 기간: ${rangeText}\n- 수강 과목: ${courseName}\n- 총 수업 횟수: ${total}\n- 출석 횟수: ${present}\n- 지각 횟수: ${late}\n- 결석 횟수: ${absent}\n- 종합 출석률: ${rate}\n\n감사합니다.`;

      sendReportBtn.disabled = true;
      sendReportBtn.innerHTML = '이메일 리포트 전송 중...';

      try {
        const canvas = document.getElementById('report-chart');
        let chartBase64 = '';
        let base64Data = '';
        if (canvas) {
          chartBase64 = canvas.toDataURL('image/png');
          base64Data = chartBase64.split(',')[1];
        }

        if (provider === 'gmail-gas' && settings.emailService?.gmailGasUrl) {
          // Google Apps Script로 이미지 첨부 HTML 메일 전송
          const htmlBody = `
            <div style="font-family: 'Malgun Gothic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-top: 0;">📊 [출결 리포트] ${student.name} 학생의 과외 수업 보고서</h2>
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">
                안녕하세요, <b>${student.parentName || '학부모님'}</b>.<br>
                ${student.name} 학생의 과외 수업 출결 통계 및 리포트를 안내해 드립니다.
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #edf2f7;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold; color: #718096;">조회 기간</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${rangeText}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold; color: #718096;">수강 과목</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #4f46e5;">${courseName}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold; color: #718096;">총 수업 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${total}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; color: #10b981;"><td style="padding: 8px 0; font-weight: bold;">출석 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${present}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; color: #f59e0b;"><td style="padding: 8px 0; font-weight: bold;">지각 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${late}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; color: #ef4444;"><td style="padding: 8px 0; font-weight: bold;">결석 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${absent}</td></tr>
                  <tr style="font-weight: bold; color: #4f46e5; font-size: 16px;"><td style="padding: 12px 0 0 0;">종합 출석률</td><td style="padding: 12px 0 0 0; text-align: right; font-size: 18px;">${rate}</td></tr>
                </table>
              </div>
              
              <p style="color: #718096; font-size: 13px; line-height: 1.5; margin-top: 15px;">
                ※ 출결 분석 그래프는 이메일에 파일 첨부(<b>${student.name}_출결리포트.png</b>)되어 발송되었습니다.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
              <p style="font-size: 11px; color: #a0aec0; text-align: center; margin-bottom: 0;">
                본 메일은 유진쌤 튜션 파트너 로컬 알림 서비스를 통해 자동 발송되었습니다.
              </p>
            </div>
          `;
          
          const response = await fetch(settings.emailService.gmailGasUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain' // Preflight 방지
            },
            body: JSON.stringify({
              to: student.parentEmail,
              subject: subject,
              html: htmlBody,
              attachments: [
                {
                  content: base64Data,
                  filename: `${student.name}_출결리포트.png`
                }
              ]
            })
          });
          
          const resData = await response.json();
          if (response.ok && resData.success) {
            showToast('학부모님께 출결 리포트 이메일이 발송되었습니다!');
          } else {
            throw new Error(resData.error || 'Google Apps Script 발송 에러');
          }
        }
        else if (provider === 'resend' && settings.emailService?.resendApiKey) {
          // Resend로 이미지 첨부 HTML 메일 전송
          const htmlBody = `
            <div style="font-family: 'Malgun Gothic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-top: 0;">📊 [출결 리포트] ${student.name} 학생의 과외 수업 보고서</h2>
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">
                안녕하세요, <b>${student.parentName || '학부모님'}</b>.<br>
                ${student.name} 학생의 과외 수업 출결 통계 및 리포트를 안내해 드립니다.
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #edf2f7;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold; color: #718096;">조회 기간</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${rangeText}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold; color: #718096;">수강 과목</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #4f46e5;">${courseName}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold; color: #718096;">총 수업 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${total}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; color: #10b981;"><td style="padding: 8px 0; font-weight: bold;">출석 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${present}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; color: #f59e0b;"><td style="padding: 8px 0; font-weight: bold;">지각 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${late}</td></tr>
                  <tr style="border-bottom: 1px solid #e2e8f0; color: #ef4444;"><td style="padding: 8px 0; font-weight: bold;">결석 횟수</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${absent}</td></tr>
                  <tr style="font-weight: bold; color: #4f46e5; font-size: 16px;"><td style="padding: 12px 0 0 0;">종합 출석률</td><td style="padding: 12px 0 0 0; text-align: right; font-size: 18px;">${rate}</td></tr>
                </table>
              </div>
              
              <p style="color: #718096; font-size: 13px; line-height: 1.5; margin-top: 15px;">
                ※ 출결 분석 그래프는 이메일에 파일 첨부(<b>${student.name}_출결리포트.png</b>)되어 발송되었습니다.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
              <p style="font-size: 11px; color: #a0aec0; text-align: center; margin-bottom: 0;">
                본 메일은 유진쌤 튜션 파트너 로컬 알림 서비스를 통해 자동 발송되었습니다.
              </p>
            </div>
          `;
          
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              apiKey: settings.emailService.resendApiKey,
              from: settings.emailService.resendFromEmail || 'onboarding@resend.dev',
              to: student.parentEmail,
              subject: subject,
              html: htmlBody,
              attachments: [
                {
                  content: base64Data,
                  filename: `${student.name}_출결리포트.png`
                }
              ]
            })
          });
          
          if (response.ok) {
            showToast('학부모님께 출결 리포트 이메일이 발송되었습니다!');
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Resend 발송 에러');
          }
        } 
        else if (provider === 'emailjs' && settings.emailService?.emailjsServiceId) {
          // EmailJS로 메일 전송 (차트 이미지도 dynamic attachment 처리 가능하도록 파라미터 연동)
          const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              service_id: settings.emailService.emailjsServiceId,
              template_id: settings.emailService.emailjsTemplateId,
              user_id: settings.emailService.emailjsUserId,
              template_params: {
                to_email: student.parentEmail,
                to_name: student.parentName,
                student_name: student.name,
                subject: subject,
                message: textMessage,
                chart_image: chartBase64
              }
            })
          });
          
          if (response.ok) {
            showToast('EmailJS를 통해 출결 리포트 이메일이 발송되었습니다!');
          } else {
            const errorText = await response.text();
            throw new Error(errorText);
          }
        } 
        else {
          // 기본 mailto 전송
          const mailtoUrl = `mailto:${student.parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textMessage)}`;
          window.open(mailtoUrl, '_self');
          showToast('메일 전송 창이 실행되었습니다.');
        }
      } catch (error) {
        console.error('리포트 메일 발송 실패:', error);
        alert('출결 리포트 전송 중 에러가 발생했습니다:\n' + error.message + '\n\n기본 이메일 앱(mailto)으로 전환하여 전송합니다.');
        const mailtoUrl = `mailto:${student.parentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textMessage)}`;
        window.open(mailtoUrl, '_self');
      } finally {
        sendReportBtn.disabled = false;
        sendReportBtn.innerHTML = '<i data-lucide="send"></i> 학부모에게 이메일 리포트 발송';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
}

// 3. 학생 등록 / 수정 모달 폼 (B안: 연락처 위주의 프로필 폼)
function openStudentFormModal(student = null) {
  const modalOverlay = document.getElementById('common-modal');
  const modalContent = modalOverlay.querySelector('.modal-content');
  
  const isEdit = !!student;
  const title = isEdit ? '학생 정보 수정' : '신규 학생 등록';
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close-btn" id="close-modal">&times;</button>
    </div>
    <form id="student-form">
      <div class="modal-body">
        
        <div class="form-group">
          <label>학생 이름 *</label>
          <input type="text" class="form-control" name="name" value="${isEdit ? student.name : ''}" required placeholder="예: 홍길동">
        </div>

        <div class="grid-2" style="gap: 1rem; margin-bottom: 0;">
          <div class="form-group">
            <label>학생 연락처</label>
            <input type="tel" class="form-control" name="studentPhone" value="${isEdit ? student.studentPhone : ''}" placeholder="예: 010-1234-5678">
          </div>
          <div class="form-group">
            <label>학생 카카오톡 ID</label>
            <input type="text" class="form-control" name="studentKakaoId" value="${isEdit ? student.studentKakaoId : ''}" placeholder="카카오톡 아이디">
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 0.5rem 0 1.25rem 0;">

        <div class="grid-2" style="gap: 1rem; margin-bottom: 0;">
          <div class="form-group">
            <label>학부모 이름</label>
            <input type="text" class="form-control" name="parentName" value="${isEdit ? student.parentName : ''}" placeholder="예: 학부모 (모)">
          </div>
          <div class="form-group">
            <label>학부모 연락처 * (WhatsApp/카톡용)</label>
            <input type="tel" class="form-control" name="parentPhone" value="${isEdit ? student.parentPhone : ''}" required placeholder="국가코드 포함 권장, 예: 60162620030">
          </div>
        </div>

        <div class="grid-2" style="gap: 1rem; margin-bottom: 0;">
          <div class="form-group">
            <label>학부모 이메일</label>
            <input type="email" class="form-control" name="parentEmail" value="${isEdit ? student.parentEmail : ''}" placeholder="예: parent@example.com">
          </div>
          <div class="form-group">
            <label>학부모 카카오톡 ID</label>
            <input type="text" class="form-control" name="parentKakaoId" value="${isEdit ? student.parentKakaoId : ''}" placeholder="학부모 카카오톡 아이디">
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 0.5rem 0 1.25rem 0;">

        <div class="form-group" style="margin-bottom: 0;">
          <label>특이사항 및 수업 약정 메모</label>
          <textarea class="form-control" name="notes" rows="3" placeholder="기타 수업 관련 주의사항이나 메모를 입력하세요.">${isEdit ? student.notes : ''}</textarea>
        </div>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="close-modal-footer">취소</button>
        <button type="submit" class="btn btn-primary">저장</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const closeModal = () => modalOverlay.classList.remove('active');
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-footer').addEventListener('click', closeModal);

  const form = document.getElementById('student-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const studentData = {
      name: form.name.value,
      studentPhone: form.studentPhone.value,
      studentKakaoId: form.studentKakaoId.value,
      parentName: form.parentName.value,
      parentPhone: form.parentPhone.value,
      parentEmail: form.parentEmail.value,
      parentKakaoId: form.parentKakaoId.value,
      notes: form.notes.value
    };

    if (isEdit) {
      updateStudent(student.id, studentData);
      showToast('학생 정보가 수정되었습니다.');
    } else {
      const newStudent = addStudent(studentData);
      showToast('새로운 학생이 등록되었습니다! 과목을 추가해 주세요.');
      activeStudentId = newStudent.id; // 즉시 상세 화면으로 유도
    }
    
    closeModal();
    
    const studentViewContainer = document.getElementById('students-view');
    renderStudents(studentViewContainer);
  });
}

// 4. 과목 등록 및 수정 모달 (B안 추가)
function openCourseFormModal(studentId, course = null) {
  const modalOverlay = document.getElementById('common-modal');
  const modalContent = modalOverlay.querySelector('.modal-content');
  
  const isEdit = !!course;
  const title = isEdit ? '수강 과목 정보 수정' : '새 수강 과목 등록';
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close-btn" id="close-modal">&times;</button>
    </div>
    <form id="course-form">
      <div class="modal-body">
        
        <div class="form-group">
          <label>과목명 *</label>
          <input type="text" class="form-control" name="subject" value="${isEdit ? course.subject : ''}" required placeholder="예: 중2 수학, 영어 작문">
        </div>

        <div class="form-group">
          <label>수업료 금액 *</label>
          <input type="number" class="form-control" name="tuitionFee" value="${isEdit ? course.tuitionFee : ''}" required placeholder="예: 150">
        </div>

        <div class="grid-2" style="gap: 1rem; margin-bottom: 0;">
          <div class="form-group">
            <label>수업료 결제 주기 *</label>
            <select class="form-control" name="tuitionCycle">
              <option value="monthly" ${isEdit && course.tuitionCycle === 'monthly' ? 'selected' : ''}>매달 날짜 지정 (월급제)</option>
              <option value="count" ${isEdit && course.tuitionCycle === 'count' ? 'selected' : ''}>일정 횟수 단위 (횟수제)</option>
            </select>
          </div>
          <div class="form-group">
            <label id="cycle-value-label">결제 일자 (일) *</label>
            <input type="number" class="form-control" name="tuitionCycleValue" value="${isEdit ? course.tuitionCycleValue : '10'}" required min="1" max="31">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label>과목 세부 메모</label>
          <textarea class="form-control" name="notes" rows="2" placeholder="교재 정보나 수업 진도 계획 등">${isEdit ? course.notes : ''}</textarea>
        </div>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="close-modal-footer">취소</button>
        <button type="submit" class="btn btn-primary">저장</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const closeModal = () => modalOverlay.classList.remove('active');
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-footer').addEventListener('click', closeModal);

  const form = document.getElementById('course-form');
  const cycleSelect = form.querySelector('select[name="tuitionCycle"]');
  const valueLabel = document.getElementById('cycle-value-label');
  const valueInput = form.querySelector('input[name="tuitionCycleValue"]');

  const updateCycleLabel = () => {
    if (cycleSelect.value === 'monthly') {
      valueLabel.innerText = '결제 일자 (일) *';
      valueInput.placeholder = '예: 10 (매달 10일)';
      valueInput.max = '31';
      valueInput.min = '1';
    } else {
      valueLabel.innerText = '기준 횟수 (회) *';
      valueInput.placeholder = '예: 8 (8회 기준)';
      valueInput.removeAttribute('max');
      valueInput.min = '1';
    }
  };

  cycleSelect.addEventListener('change', updateCycleLabel);
  updateCycleLabel();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const courseData = {
      subject: form.subject.value,
      tuitionFee: form.tuitionFee.value,
      tuitionCycle: form.tuitionCycle.value,
      tuitionCycleValue: form.tuitionCycleValue.value,
      notes: form.notes.value
    };

    if (isEdit) {
      updateCourse(studentId, course.id, courseData);
      showToast('과목 정보가 수정되었습니다.');
    } else {
      addCourse(studentId, courseData);
      showToast('과목이 추가되었습니다.');
    }
    
    closeModal();
    renderStudentDetail(document.getElementById('students-view'), studentId);
  });
}

// 5. 수업료 청구서 추가 모달
function openAddPaymentModal(student) {
  const modalOverlay = document.getElementById('common-modal');
  const modalContent = modalOverlay.querySelector('.modal-content');

  const todayStr = new Date().toISOString().split('T')[0];
  const courses = student.courses || [];

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>수업료 청구 추가</h3>
      <button class="modal-close-btn" id="close-modal">&times;</button>
    </div>
    <form id="payment-form">
      <div class="modal-body">
        <p class="mb-2" style="font-size: 0.9rem; color: var(--text-secondary);">
          <b>${student.name}</b> 학생의 수업료 결제 요청서를 새로 추가합니다.
        </p>

        <div class="form-group">
          <label>청구 대상 과목 *</label>
          <select class="form-control" name="courseId" required>
            ${courses.map(c => `<option value="${c.id}" data-fee="${c.fee || c.tuitionFee}" data-cycle="${c.tuitionCycle}" data-cycle-val="${c.tuitionCycleValue}">${c.subject}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>청구 금액 *</label>
          <input type="number" class="form-control" name="amount" required>
        </div>

        <div class="form-group">
          <label>납부 기한일 *</label>
          <input type="date" class="form-control" name="dueDate" value="${todayStr}" required>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label>설명 및 회차 정보</label>
          <input type="text" class="form-control" name="notes" placeholder="예: 7월분 과외비, 9~16회차 수업료">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="close-modal-footer">취소</button>
        <button type="submit" class="btn btn-primary">청구 추가</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const closeModal = () => modalOverlay.classList.remove('active');
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-footer').addEventListener('click', closeModal);

  const form = document.getElementById('payment-form');
  const courseSelect = form.querySelector('select[name="courseId"]');
  const amountInput = form.querySelector('input[name="amount"]');
  const notesInput = form.querySelector('input[name="notes"]');

  // 과목 선택 변경 시 수업료 및 설명 자동 완성
  const updateFieldsFromSelectedCourse = () => {
    const selectedOpt = courseSelect.selectedOptions[0];
    if (!selectedOpt) return;
    
    const fee = selectedOpt.dataset.fee;
    const cycle = selectedOpt.dataset.cycle;
    const cycleVal = selectedOpt.dataset.cycleVal;
    
    amountInput.value = fee;
    notesInput.value = cycle === 'count' ? `${cycleVal}회 과외비` : '월분 과외비';
  };

  courseSelect.addEventListener('change', updateFieldsFromSelectedCourse);
  updateFieldsFromSelectedCourse(); // 초기 자동 선택용 실행

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    addPayment({
      studentId: student.id,
      courseId: courseSelect.value, // 과목 ID 연계 청구
      amount: form.amount.value,
      dueDate: form.dueDate.value,
      notes: form.notes.value,
      status: 'unpaid'
    });

    showToast('수업료 청구서가 등록되었습니다.');
    closeModal();
    
    renderStudentDetail(document.getElementById('students-view'), student.id);
  });
}
