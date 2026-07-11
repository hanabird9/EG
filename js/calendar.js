// 캘린더 모듈
import { getStudents, getSessions, getPayments, getSettings, addSession, addRecurringSessions, updateSession, deleteSession, deleteRecurringSessions, resolveSessionPayment } from './db.js';
import { openNotificationModal, showToast } from './dashboard.js';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed
let selectedDateStr = new Date().toISOString().split('T')[0]; // 현재 선택된 날짜 (Agenda용)

export function renderCalendar(container) {
  const students = getStudents();
  const sessions = getSessions();
  const payments = getPayments();
  
  // 캘린더 레이아웃 그리기
  container.innerHTML = `
    <div class="calendar-container">
      <div class="calendar-header">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <h2 id="calendar-title">${currentYear}년 ${currentMonth + 1}월</h2>
          <div class="calendar-header-actions">
            <button class="btn btn-secondary btn-icon" id="btn-prev-month"><i data-lucide="chevron-left"></i></button>
            <button class="btn btn-secondary btn-icon" id="btn-next-month"><i data-lucide="chevron-right"></i></button>
            <button class="btn btn-secondary" id="btn-today">오늘</button>
          </div>
        </div>
        <div>
          <button class="btn btn-primary" id="btn-add-session"><i data-lucide="plus"></i> 수업 일정 추가</button>
        </div>
      </div>
      <div class="calendar-grid" id="calendar-grid">
        <!-- 요일 라벨 -->
        <div class="calendar-day-label" style="color: #ef4444;">일</div>
        <div class="calendar-day-label">월</div>
        <div class="calendar-day-label">화</div>
        <div class="calendar-day-label">수</div>
        <div class="calendar-day-label">목</div>
        <div class="calendar-day-label">금</div>
        <div class="calendar-day-label" style="color: #3b82f6;">토</div>
        <!-- 날짜 그리드는 JS로 채워짐 -->
      </div>
    </div>
    
    <!-- 하단 상세 일정 아젠다 뷰 추가 (모바일 핵심 대응) -->
    <div class="calendar-agenda-container" id="calendar-agenda-container"></div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // 이벤트 바인딩
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateCalendarGrid(container, students, sessions, payments);
  });

  document.getElementById('btn-next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateCalendarGrid(container, students, sessions, payments);
  });

  document.getElementById('btn-today').addEventListener('click', () => {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    selectedDateStr = today.toISOString().split('T')[0];
    updateCalendarGrid(container, students, sessions, payments);
  });

  document.getElementById('btn-add-session').addEventListener('click', () => {
    openAddSessionModal(students, selectedDateStr);
  });

  // 그리드 업데이트
  updateCalendarGrid(container, students, sessions, payments);
}

// 캘린더 그리드 그리는 함수
function updateCalendarGrid(container, students, sessions, payments) {
  document.getElementById('calendar-title').innerText = `${currentYear}년 ${currentMonth + 1}월`;
  
  const grid = document.getElementById('calendar-grid');
  
  // 기존 날짜 노드들 제거 (요일 라벨 7개는 유지)
  const labelsCount = 7;
  while (grid.children.length > labelsCount) {
    grid.removeChild(grid.lastChild);
  }

  // 1일의 요일과 해당 월의 총 일수 구하기
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // 이전달의 마지막 일수 구하기 (빈칸 채우기용)
  const prevLastDate = new Date(currentYear, currentMonth, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // 1. 이전달 날짜 채우기 (앞쪽 빈칸)
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = prevLastDate - i;
    const dateCell = createDateCell(currentYear, currentMonth - 1, dayNum, true, todayStr);
    
    // 이전달 년/월 계산 보정
    let prevYear = currentYear;
    let prevMonthVal = currentMonth;
    if (currentMonth === 0) {
      prevYear--;
      prevMonthVal = 12;
    }
    const cellDateStr = `${prevYear}-${String(prevMonthVal).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    
    if (cellDateStr === selectedDateStr) {
      dateCell.classList.add('selected-day');
    }
    
    dateCell.addEventListener('click', () => {
      selectedDateStr = cellDateStr;
      updateCalendarGrid(container, students, sessions, payments);
    });
    
    grid.appendChild(dateCell);
  }

  // 2. 이번달 날짜 채우기
  for (let i = 1; i <= lastDate; i++) {
    const dateCell = createDateCell(currentYear, currentMonth, i, false, todayStr);
    const cellDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    if (cellDateStr === selectedDateStr) {
      dateCell.classList.add('selected-day');
    }
    
    // 해당 날짜의 세션 필터링
    const daySessions = sessions.filter(session => {
      const sDate = new Date(session.startTime).toISOString().split('T')[0];
      return sDate === cellDateStr;
    }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // 세션 이벤트 추가
    daySessions.forEach(session => {
      const eventEl = document.createElement('div');
      eventEl.className = 'calendar-event';
      
      // 수납 여부에 따라 클래스 결정 (선불/후불 동적 매칭 반영)
      let paymentClass = 'calendar-event-unbilled';
      const student = students.find(s => s.id === session.studentId);
      const courses = student ? (student.courses || []) : [];
      const payment = resolveSessionPayment(session, payments, courses);
      if (payment) {
        paymentClass = payment.status === 'paid' ? 'calendar-event-paid' : 'calendar-event-unpaid';
      }
      eventEl.classList.add(paymentClass);
      
      const startTime = new Date(session.startTime);
      const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
      const studentName = student ? student.name : '알수없음';
      const course = student && student.courses ? student.courses.find(c => c.id === session.courseId) : null;
      const courseSubject = course ? course.subject : '';
      
      eventEl.innerHTML = `<span class="event-time">${timeStr}</span><span class="event-details"> ${studentName} ${courseSubject}</span>`;
      eventEl.title = `${studentName} - ${courseSubject} (${session.attendance === 'present' ? '출석' : session.attendance === 'late' ? '지각' : session.attendance === 'absent' ? '결석' : '출결 대기'})`;
      
      // 이벤트 클릭 시 상세 팝업
      eventEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openSessionDetailsModal(session, students, payments);
      });
      
      dateCell.appendChild(eventEl);
    });

    // 날짜 칸 클릭 시 선택 처리 및 아젠다 갱신
    dateCell.addEventListener('click', () => {
      selectedDateStr = cellDateStr;
      updateCalendarGrid(container, students, sessions, payments);
    });

    grid.appendChild(dateCell);
  }

  // 3. 다음달 날짜 채우기 (뒷쪽 빈칸)
  const totalCells = grid.children.length - labelsCount; // 날짜 셀 개수
  const nextMonthCellsNeeded = 42 - totalCells; // 6주 완성 그리드
  for (let i = 1; i <= nextMonthCellsNeeded; i++) {
    const dateCell = createDateCell(currentYear, currentMonth + 1, i, true, todayStr);
    
    // 다음달 년/월 계산 보정
    let nextYear = currentYear;
    let nextMonthVal = currentMonth + 2;
    if (currentMonth === 11) {
      nextYear++;
      nextMonthVal = 1;
    }
    const cellDateStr = `${nextYear}-${String(nextMonthVal).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    if (cellDateStr === selectedDateStr) {
      dateCell.classList.add('selected-day');
    }
    
    dateCell.addEventListener('click', () => {
      selectedDateStr = cellDateStr;
      updateCalendarGrid(container, students, sessions, payments);
    });
    
    grid.appendChild(dateCell);
  }
  
  // 하단 아젠다 리스트 렌더링
  renderAgenda(students, sessions, payments);
}

// 선택 날짜 상세 일정 리스트 (Agenda View) 그리기
function renderAgenda(students, sessions, payments) {
  const agendaContainer = document.getElementById('calendar-agenda-container');
  if (!agendaContainer) return;
  
  const targetDate = new Date(selectedDateStr);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateFormatted = `${targetDate.getFullYear()}년 ${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일 (${weekDays[targetDate.getDay()]})`;
  
  // 해당 날짜의 세션 필터링
  const daySessions = sessions.filter(session => {
    const sDate = new Date(session.startTime).toISOString().split('T')[0];
    return sDate === selectedDateStr;
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  let html = `
    <div class="agenda-header flex-between" style="margin-bottom: 1rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-top: 1.5rem;">
      <h3 style="font-weight: 700; font-size: 1.1rem; display:flex; align-items:center; gap:0.5rem;">
        <i data-lucide="calendar-check" style="color:var(--accent); width:20px; height:20px;"></i> ${dateFormatted} 수업 일정
      </h3>
      <button class="btn btn-secondary btn-icon" id="btn-agenda-add" style="padding: 0.35rem 0.5rem; font-size: 0.8rem; display:flex; align-items:center; gap:0.25rem;">
        <i data-lucide="plus" style="width:14px; height:14px;"></i> 수업 추가
      </button>
    </div>
    <div class="agenda-list" style="display:flex; flex-direction:column; gap:0.75rem;">
  `;
  
  if (daySessions.length === 0) {
    html += `
      <div style="text-align: center; color: var(--text-secondary); padding: 2rem 0; border: 1px dashed var(--border); border-radius: 0.5rem; font-size: 0.9rem; background-color: var(--bg-secondary);">
        이 날짜에는 등록된 수업 일정이 없습니다.
      </div>
    `;
  } else {
    daySessions.forEach(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')} ~ ${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
      
      const student = students.find(s => s.id === session.studentId);
      const studentName = student ? student.name : '알수없음';
      
      const courses = student ? (student.courses || []) : [];
      const course = courses.find(c => c.id === session.courseId);
      const courseSubject = course ? course.subject : '과외';
      
      // 수납 상태 조회
      const payment = resolveSessionPayment(session, payments, courses);
      let paymentBadge = '';
      if (payment) {
        paymentBadge = payment.status === 'paid' ? 
          `<span class="payment-badge payment-badge-paid">수납 완료</span>` : 
          `<span class="payment-badge payment-badge-unpaid">미납</span>`;
      } else {
        paymentBadge = `<span class="payment-badge payment-badge-unbilled">미청구</span>`;
      }
      
      // 출결 상태
      const attText = session.attendance === 'present' ? '출석' :
                      session.attendance === 'late' ? '지각' :
                      session.attendance === 'absent' ? '결석' : '출결 대기';
      const attBadgeClass = session.attendance === 'present' ? 'badge-present' :
                            session.attendance === 'late' ? 'badge-late' :
                            session.attendance === 'absent' ? 'badge-absent' : 'badge-pending';
      
      html += `
        <div class="agenda-item card" data-id="${session.id}" style="padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--border); background-color: var(--bg-secondary); cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;">
          <div class="flex-between" style="margin-bottom: 0.5rem;">
            <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary); display:flex; align-items:center; gap:0.5rem;">
              ${studentName} <span class="badge ${attBadgeClass}" style="font-size:0.7rem; padding:0.15rem 0.5rem;">${attText}</span>
            </span>
            ${paymentBadge}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); display:flex; flex-direction:column; gap:0.25rem;">
            <div style="display:flex; align-items:center; gap:0.25rem;"><i data-lucide="book-open" style="width:14px; height:14px; color:var(--accent);"></i> <b>과목:</b> ${courseSubject}</div>
            <div style="display:flex; align-items:center; gap:0.25rem;"><i data-lucide="clock" style="width:14px; height:14px; color:var(--accent);"></i> <b>시간:</b> ${timeStr}</div>
            ${session.notes ? `<div style="margin-top:0.25rem; font-style:italic; color:var(--text-tertiary);">"${session.notes}"</div>` : ''}
          </div>
        </div>
      `;
    });
  }
  
  html += `</div>`;
  agendaContainer.innerHTML = html;
  
  if (window.lucide) window.lucide.createIcons();
  
  // 수업 추가 버튼 이벤트 바인딩
  document.getElementById('btn-agenda-add').addEventListener('click', (e) => {
    e.stopPropagation();
    openAddSessionModal(students, selectedDateStr);
  });
  
  // 각 아이템 클릭 이벤트 바인딩 (상세 팝업 열기)
  const agendaItems = agendaContainer.querySelectorAll('.agenda-item');
  agendaItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionId = item.dataset.id;
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        openSessionDetailsModal(session, students, payments);
      }
    });
    
    // 호버 스타일링
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'translateY(-2px)';
      item.style.boxShadow = 'var(--shadow-md)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.transform = 'translateY(0)';
      item.style.boxShadow = 'none';
    });
  });
}

function createDateCell(year, month, dayNum, isOtherMonth, todayStr) {
  // 실제 월 계산 (이전/이후 달 보정)
  let actualYear = year;
  let actualMonth = month;
  if (month < 0) {
    actualMonth = 11;
    actualYear--;
  } else if (month > 11) {
    actualMonth = 0;
    actualYear++;
  }

  const cell = document.createElement('div');
  cell.className = 'calendar-day';
  if (isOtherMonth) {
    cell.classList.add('other-month');
  }

  const numberEl = document.createElement('div');
  numberEl.className = 'calendar-day-number';
  numberEl.innerText = dayNum;
  cell.appendChild(numberEl);

  // 오늘 날짜 하이라이트
  const cellDateStr = `${actualYear}-${actualMonth}-${dayNum}`;
  if (cellDateStr === todayStr) {
    cell.classList.add('today');
  }

  // 주말 색상 지정
  const dayOfWeek = new Date(actualYear, actualMonth, dayNum).getDay();
  if (dayOfWeek === 0) {
    numberEl.style.color = '#ef4444'; // 일요일 빨간색
  } else if (dayOfWeek === 6) {
    numberEl.style.color = '#3b82f6'; // 토요일 파란색
  }

  return cell;
}

// 1. 수업 등록 모달 띄우기
function openAddSessionModal(students, defaultDate = '') {
  if (students.length === 0) {
    showToast('먼저 [학생 관리] 탭에서 학생을 등록해 주세요!');
    return;
  }

  const modalOverlay = document.getElementById('common-modal');
  const modalContent = modalOverlay.querySelector('.modal-content');

  const todayDateStr = defaultDate || new Date().toISOString().split('T')[0];
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>새 수업 등록</h3>
      <button class="modal-close-btn" id="close-modal">&times;</button>
    </div>
    <form id="add-session-form">
      <div class="modal-body">
        
        <div class="form-group">
          <label>학생 선택</label>
          <select class="form-control" name="studentId" required>
            ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>수강 과목 선택</label>
          <select class="form-control" name="courseId" required>
            <!-- 자바스크립트로 동적 로드 -->
          </select>
        </div>

        <div class="form-group">
          <label>수업 날짜</label>
          <input type="date" class="form-control" name="sessionDate" value="${todayDateStr}" required>
        </div>

        <div class="grid-2" style="gap: 1rem; margin-bottom: 0;">
          <div class="form-group">
            <label>시작 시간</label>
            <div style="display: flex; gap: 0.25rem; align-items: center;">
              <select class="form-control" name="startHour" style="flex: 1; min-width: 60px;">
                ${Array.from({length: 24}, (_, i) => `<option value="${String(i).padStart(2, '0')}" ${i === 14 ? 'selected' : ''}>${String(i).padStart(2, '0')}시</option>`).join('')}
              </select>
              <select class="form-control" name="startMinute" style="flex: 1; min-width: 60px;">
                ${Array.from({length: 60}, (_, i) => `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}분</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>종료 시간</label>
            <div style="display: flex; gap: 0.25rem; align-items: center;">
              <select class="form-control" name="endHour" style="flex: 1; min-width: 60px;">
                ${Array.from({length: 24}, (_, i) => `<option value="${String(i).padStart(2, '0')}" ${i === 16 ? 'selected' : ''}>${String(i).padStart(2, '0')}시</option>`).join('')}
              </select>
              <select class="form-control" name="endMinute" style="flex: 1; min-width: 60px;">
                ${Array.from({length: 60}, (_, i) => `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}분</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- 반복 설정 섹션 -->
        <div style="border: 1px solid var(--border); padding: 1rem; border-radius: 0.5rem; background-color: var(--bg-tertiary); margin-top: 0.5rem;">
          <div class="checkbox-item" style="font-weight: 600; margin-bottom: 0.75rem;">
            <input type="checkbox" id="checkbox-recur" name="isRecurring">
            <label for="checkbox-recur" style="cursor: pointer; margin: 0;">매주 반복 일정으로 등록</label>
          </div>
          
          <div id="recur-details" style="display: none; flex-direction: column; gap: 0.75rem;">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">반복 요일 선택</label>
            <div class="checkbox-group">
              <span class="checkbox-item"><input type="checkbox" name="recurDays" value="1" id="day-mon"><label for="day-mon">월</label></span>
              <span class="checkbox-item"><input type="checkbox" name="recurDays" value="2" id="day-tue"><label for="day-tue">화</label></span>
              <span class="checkbox-item"><input type="checkbox" name="recurDays" value="3" id="day-wed"><label for="day-wed">수</label></span>
              <span class="checkbox-item"><input type="checkbox" name="recurDays" value="4" id="day-thu"><label for="day-thu">목</label></span>
              <span class="checkbox-item"><input type="checkbox" name="recurDays" value="5" id="day-fri"><label for="day-fri">금</label></span>
              <span class="checkbox-item"><input type="checkbox" name="recurDays" value="6" id="day-sat"><label for="day-sat">토</label></span>
              <span class="checkbox-item"><input type="checkbox" name="recurDays" value="0" id="day-sun"><label for="day-sun">일</label></span>
            </div>
            <div class="form-group" style="margin: 0;">
              <label>반복 종료일</label>
              <input type="date" class="form-control" name="recurEndDate" value="${new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().split('T')[0]}">
            </div>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="close-modal-footer">취소</button>
        <button type="submit" class="btn btn-primary">등록</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const closeModal = () => modalOverlay.classList.remove('active');
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-footer').addEventListener('click', closeModal);

  // 반복 체크박스 토글 처리
  const recurCheckbox = document.getElementById('checkbox-recur');
  const recurDetails = document.getElementById('recur-details');
  recurCheckbox.addEventListener('change', () => {
    recurDetails.style.display = recurCheckbox.checked ? 'flex' : 'none';
  });

  // 학생 선택에 따른 과목 목록 동적 업데이트
  const form = document.getElementById('add-session-form');
  const studentSelect = form.querySelector('select[name="studentId"]');
  const courseSelect = form.querySelector('select[name="courseId"]');

  const updateCourseDropdown = () => {
    const studentId = studentSelect.value;
    const selectedStudent = students.find(s => s.id === studentId);
    const courses = selectedStudent ? (selectedStudent.courses || []) : [];
    
    if (courses.length === 0) {
      courseSelect.innerHTML = `<option value="" disabled selected>등록된 수강 과목이 없습니다.</option>`;
    } else {
      courseSelect.innerHTML = courses.map(c => `<option value="${c.id}">${c.subject}</option>`).join('');
    }
  };

  studentSelect.addEventListener('change', updateCourseDropdown);
  updateCourseDropdown(); // 초기 로드

  // 폼 제출 핸들러
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const studentId = form.studentId.value;
    const courseId = form.courseId.value;
    const sessionDate = form.sessionDate.value;
    const startHour = form.startHour.value;
    const startMinute = form.startMinute.value;
    const endHour = form.endHour.value;
    const endMinute = form.endMinute.value;
    const isRecurring = form.isRecurring.checked;

    if (!courseId) {
      alert('선택한 학생의 수강 과목이 등록되지 않았습니다. [학생 관리] 탭에서 먼저 수강 과목을 추가해 주세요.');
      return;
    }
    
    const selectedStudent = students.find(s => s.id === studentId);
    const selectedCourse = selectedStudent.courses.find(c => c.id === courseId);
    const title = `${selectedStudent.name} - ${selectedCourse.subject}`;
    
    const startTimeISO = new Date(`${sessionDate}T${startHour}:${startMinute}:00`).toISOString();
    const endTimeISO = new Date(`${sessionDate}T${endHour}:${endMinute}:00`).toISOString();
    
    if (isRecurring) {
      const checkedDays = Array.from(form.querySelectorAll('input[name="recurDays"]:checked')).map(el => Number(el.value));
      const recurEndDate = form.recurEndDate.value;
      
      if (checkedDays.length === 0) {
        alert('반복할 요일을 최소 한 개 이상 선택해 주세요.');
        return;
      }
      
      addRecurringSessions({
        studentId,
        courseId,
        title,
        startTime: startTimeISO,
        endTime: endTimeISO
      }, {
        days: checkedDays,
        endDate: recurEndDate
      });
      
      showToast('반복 일정 추가 완료!');
    } else {
      addSession({
        studentId,
        courseId,
        title,
        startTime: startTimeISO,
        endTime: endTimeISO
      });
      
      showToast('수업 일정 추가 완료!');
    }
    
    closeModal();
    // 달력 강제 업데이트
    renderCalendar(document.getElementById('calendar-view'));
  });
}

// 2. 수업 일정 상세/출결처리 모달
function openSessionDetailsModal(session, students, payments) {
  const modalOverlay = document.getElementById('common-modal');
  const modalContent = modalOverlay.querySelector('.modal-content');
  
  const student = students.find(s => s.id === session.studentId) || { name: '알 수 없음', courses: [] };
  const courseSubject = student.courses ? (student.courses.find(c => c.id === session.courseId)?.subject || '알수없음') : '알수없음';
  
  const sDate = new Date(session.startTime);
  const eDate = new Date(session.endTime);
  const dateString = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`;
  const sTimeStr = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
  const eTimeStr = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;

  // 해당 학생의 해당 과목에 대한 미납 청구서만 필터링 (수업료 연결용)
  const studentUnpaidPayments = payments.filter(p => p.studentId === session.studentId && p.courseId === session.courseId && p.status === 'unpaid');
  const currentLinkedPayment = resolveSessionPayment(session, payments, student ? (student.courses || []) : []);

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>수업 정보 & 출결 체크</h3>
      <button class="modal-close-btn" id="close-modal">&times;</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.25rem;">${student.name}</h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">
          과목: ${courseSubject} | 시간: ${dateString} (${sTimeStr} ~ ${eTimeStr})
        </p>
      </div>

      <!-- 출결 체크 폼 -->
      <div class="form-group">
        <label>출결 상태</label>
        <div style="display: flex; gap: 0.5rem; width: 100%;">
          <button class="btn flex-1 detail-attendance-btn ${session.attendance === 'present' ? 'btn-primary' : 'btn-secondary'}" data-status="present" style="flex: 1;">출석</button>
          <button class="btn flex-1 detail-attendance-btn ${session.attendance === 'late' ? 'btn-primary' : 'btn-secondary'}" data-status="late" style="flex: 1;">지각</button>
          <button class="btn flex-1 detail-attendance-btn ${session.attendance === 'absent' ? 'btn-primary' : 'btn-secondary'}" data-status="absent" style="flex: 1;">결석</button>
          <button class="btn flex-1 detail-attendance-btn ${session.attendance === 'pending' ? 'btn-primary' : 'btn-secondary'}" data-status="pending" style="flex: 1;">미체크</button>
        </div>
      </div>

      <div class="form-group">
        <label>수업 코멘트/메모</label>
        <textarea class="form-control" id="session-notes" rows="3" placeholder="오늘 수업 진도나 숙제 등 특이사항을 적어주세요.">${session.notes || ''}</textarea>
      </div>

      <!-- 수업료 청구서 연결 설정 -->
      <div class="form-group" style="border: 1px solid var(--border); padding: 1rem; border-radius: 0.5rem; background-color: var(--bg-tertiary);">
        <label style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
          <i data-lucide="credit-card" style="width: 15px;"></i> 이 수업과 연결할 수업료 청구서
        </label>
        <select class="form-control" id="session-payment-select">
          <option value="none">연결 없음 (미청구 상태)</option>
          ${currentLinkedPayment ? `<option value="${currentLinkedPayment.id}" selected>[연결됨] ${currentLinkedPayment.notes || '청구서'} (RM${currentLinkedPayment.amount.toLocaleString()} - ${currentLinkedPayment.status === 'paid' ? '완납' : '미납'})</option>` : ''}
          ${studentUnpaidPayments.filter(p => !currentLinkedPayment || p.id !== currentLinkedPayment.id).map(p => `
            <option value="${p.id}">${p.notes || '청구서'} (RM${p.amount.toLocaleString()} - 미납)</option>
          `).join('')}
        </select>
        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
          ※ 수업료 납부 상태에 따라 달력의 수업 색상이 변경됩니다.
        </p>
      </div>

    </div>
    <div class="modal-footer" style="justify-content: space-between;">
      <div>
        <button class="btn btn-danger btn-icon" id="btn-delete-session" title="수업 삭제"><i data-lucide="trash-2"></i></button>
        ${session.isRecurring ? `
          <button class="btn btn-danger" id="btn-delete-recurring-sessions" style="font-size: 0.8rem;">반복그룹 삭제</button>
        ` : ''}
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-secondary" id="close-modal-footer">취소</button>
        <button class="btn btn-secondary" id="btn-save-session-only">저장</button>
        <button class="btn btn-primary" id="btn-save-session-details">저장 및 알림</button>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  modalOverlay.classList.add('active');

  const closeModal = () => modalOverlay.classList.remove('active');
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('close-modal-footer').addEventListener('click', closeModal);

  // 출결 선택 토글
  let selectedAttendance = session.attendance;
  const detailAttendanceBtns = modalOverlay.querySelectorAll('.detail-attendance-btn');
  detailAttendanceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      detailAttendanceBtns.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      selectedAttendance = btn.dataset.status;
    });
  });

  // 단일 수업 삭제
  document.getElementById('btn-delete-session').addEventListener('click', () => {
    if (confirm('이 수업 일정을 삭제하시겠습니까?')) {
      deleteSession(session.id);
      showToast('수업 일정이 삭제되었습니다.');
      closeModal();
      renderCalendar(document.getElementById('calendar-view'));
    }
  });

  // 반복 그룹 삭제
  const btnDeleteRecur = document.getElementById('btn-delete-recurring-sessions');
  if (btnDeleteRecur) {
    btnDeleteRecur.addEventListener('click', () => {
      if (confirm('이 수업을 포함한 모든 반복 일정 그룹을 일괄 삭제하시겠습니까?')) {
        deleteRecurringSessions(session.recurrenceGroupId);
        showToast('반복 수업 그룹이 일괄 삭제되었습니다.');
        closeModal();
        renderCalendar(document.getElementById('calendar-view'));
      }
    });
  }

  // 저장만 진행 (알림 전송 안 함)
  document.getElementById('btn-save-session-only').addEventListener('click', () => {
    const notes = document.getElementById('session-notes').value;
    const paymentSelectVal = document.getElementById('session-payment-select').value;
    
    session.attendance = selectedAttendance;
    session.notes = notes;
    session.paymentId = paymentSelectVal === 'none' ? null : paymentSelectVal;
    
    updateSession(session.id, session);
    
    // 달력 리프레시
    renderCalendar(document.getElementById('calendar-view'));
    
    showToast('저장 완료!');
    closeModal();
  });

  // 저장 및 알림 진행
  document.getElementById('btn-save-session-details').addEventListener('click', () => {
    const notes = document.getElementById('session-notes').value;
    const paymentSelectVal = document.getElementById('session-payment-select').value;
    
    session.attendance = selectedAttendance;
    session.notes = notes;
    session.paymentId = paymentSelectVal === 'none' ? null : paymentSelectVal;
    
    updateSession(session.id, session);
    
    // 달력 리프레시
    renderCalendar(document.getElementById('calendar-view'));
    
    // 알림 모달 열기
    if (selectedAttendance !== 'pending') {
      const settings = getSettings();
      openNotificationModal(student, session, settings);
    } else {
      showToast('저장 완료!');
      closeModal();
    }
  });
}
