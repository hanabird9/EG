// LocalStorage 데이터베이스 모듈 (B안: 1학생 - N과목 스키마)
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const DEFAULT_SETTINGS = {
  theme: 'light',
  templates: {
    email: '[학생이름] 학생의 [수업일자] 수업 출결 알림입니다.\n\n금일 [과목] 수업에 [출결상태](으)로 처리되었습니다.\n수업 내용: [수업내용]\n\n감사합니다.',
    whatsapp: '*[학생이름] 과외 출결 안내*\n\n📚 과목: [과목]\n📅 날짜: [수업일자]\n📌 상태: *[출결상태]*\n📝 수업 내용: [수업내용]',
    kakaotalk: '[학생이름] 과외 출결 안내\n\n📚 과목: [과목]\n📅 날짜: [수업일자]\n📌 상태: [출결상태]\n📝 수업 내용: [수업내용]'
  }
};

// 중앙 상태 객체
let state = {
  students: [],
  sessions: [],
  payments: [],
  settings: { ...DEFAULT_SETTINGS }
};

// 로컬 스토리지로부터 데이터 로드
export function loadData() {
  try {
    const students = localStorage.getItem('tutor_students');
    const sessions = localStorage.getItem('tutor_sessions');
    const payments = localStorage.getItem('tutor_payments');
    const settings = localStorage.getItem('tutor_settings');

    state.students = students ? JSON.parse(students) : [];
    state.sessions = sessions ? JSON.parse(sessions) : [];
    state.payments = payments ? JSON.parse(payments) : [];
    state.settings = settings ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.error('데이터를 로드하는 중 오류가 발생했습니다:', e);
  }
  return state;
}

// 로컬 스토리지에 데이터 저장
export function saveData() {
  try {
    localStorage.setItem('tutor_students', JSON.stringify(state.students));
    localStorage.setItem('tutor_sessions', JSON.stringify(state.sessions));
    localStorage.setItem('tutor_payments', JSON.stringify(state.payments));
    localStorage.setItem('tutor_settings', JSON.stringify(state.settings));
  } catch (e) {
    console.error('데이터를 저장하는 중 오류가 발생했습니다:', e);
  }
}

// 상태 조회 함수들
export function getStudents() { return state.students; }
export function getSessions() { return state.sessions; }
export function getPayments() { return state.payments; }
export function getSettings() { return state.settings; }

// --- 학생(Student) 관련 CRUD ---
export function addStudent(studentData) {
  const newStudent = {
    id: generateUUID(),
    name: studentData.name || '',
    studentPhone: studentData.studentPhone || '',
    studentKakaoId: studentData.studentKakaoId || '',
    parentName: studentData.parentName || '',
    parentEmail: studentData.parentEmail || '',
    parentPhone: studentData.parentPhone || '',
    parentKakaoId: studentData.parentKakaoId || '',
    courses: studentData.courses || [], // 과목 배열
    notes: studentData.notes || '',
    createdAt: new Date().toISOString()
  };
  state.students.push(newStudent);
  saveData();
  return newStudent;
}

export function updateStudent(id, studentData) {
  const index = state.students.findIndex(s => s.id === id);
  if (index !== -1) {
    state.students[index] = {
      ...state.students[index],
      ...studentData,
      courses: studentData.courses || state.students[index].courses
    };
    saveData();
    return state.students[index];
  }
  return null;
}

export function deleteStudent(id) {
  // 학생 삭제 시 해당 학생의 세션, 결제 내역도 함께 연쇄 삭제
  state.students = state.students.filter(s => s.id !== id);
  state.sessions = state.sessions.filter(s => s.studentId !== id);
  state.payments = state.payments.filter(s => s.studentId !== id);
  saveData();
}

// --- 과목(Course) 관련 관리 ---
export function addCourse(studentId, courseData) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return null;
  
  const newCourse = {
    id: generateUUID(),
    subject: courseData.subject || '',
    tuitionFee: Number(courseData.tuitionFee) || 0,
    tuitionCycle: courseData.tuitionCycle || 'monthly', // 'monthly' | 'count'
    tuitionCycleValue: Number(courseData.tuitionCycleValue) || 1, // 일자 또는 회수
    notes: courseData.notes || ''
  };
  
  if (!student.courses) student.courses = [];
  student.courses.push(newCourse);
  saveData();
  return newCourse;
}

export function updateCourse(studentId, courseId, courseData) {
  const student = state.students.find(s => s.id === studentId);
  if (!student || !student.courses) return null;
  
  const index = student.courses.findIndex(c => c.id === courseId);
  if (index !== -1) {
    student.courses[index] = {
      ...student.courses[index],
      ...courseData,
      tuitionFee: Number(courseData.tuitionFee) || 0,
      tuitionCycleValue: Number(courseData.tuitionCycleValue) || 1
    };
    saveData();
    return student.courses[index];
  }
  return null;
}

export function deleteCourse(studentId, courseId) {
  const student = state.students.find(s => s.id === studentId);
  if (!student || !student.courses) return;
  
  // 과목 삭제
  student.courses = student.courses.filter(c => c.id !== courseId);
  
  // 연관된 세션 및 결제 내역 삭제
  state.sessions = state.sessions.filter(s => !(s.studentId === studentId && s.courseId === courseId));
  state.payments = state.payments.filter(p => !(p.studentId === studentId && p.courseId === courseId));
  
  saveData();
}

// --- 일정/세션(Session) 관련 CRUD ---
export function addSession(sessionData) {
  const newSession = {
    id: generateUUID(),
    studentId: sessionData.studentId,
    courseId: sessionData.courseId, // 과목 ID 연결
    title: sessionData.title || '',
    startTime: sessionData.startTime, // ISO String
    endTime: sessionData.endTime, // ISO String
    attendance: sessionData.attendance || 'pending',
    attendanceNotified: !!sessionData.attendanceNotified,
    notes: sessionData.notes || '',
    isRecurring: !!sessionData.isRecurring,
    recurrenceGroupId: sessionData.recurrenceGroupId || null,
    paymentId: sessionData.paymentId || null
  };
  state.sessions.push(newSession);
  saveData();
  return newSession;
}

// 반복 일정 추가
export function addRecurringSessions(sessionData, recurrenceConfig) {
  const sessions = [];
  const groupId = generateUUID();
  const start = new Date(sessionData.startTime);
  const end = new Date(sessionData.endTime);
  const limitDate = new Date(recurrenceConfig.endDate + 'T23:59:59');
  
  const duration = end.getTime() - start.getTime();
  
  let current = new Date(start);
  while (current <= limitDate) {
    const dayOfWeek = current.getDay();
    if (recurrenceConfig.days.includes(dayOfWeek)) {
      const currentStart = new Date(current);
      const currentEnd = new Date(currentStart.getTime() + duration);
      
      const newSession = {
        id: generateUUID(),
        studentId: sessionData.studentId,
        courseId: sessionData.courseId,
        title: sessionData.title || '',
        startTime: currentStart.toISOString(),
        endTime: currentEnd.toISOString(),
        attendance: 'pending',
        attendanceNotified: false,
        notes: '',
        isRecurring: true,
        recurrenceGroupId: groupId,
        paymentId: null
      };
      state.sessions.push(newSession);
      sessions.push(newSession);
    }
    current.setDate(current.getDate() + 1);
  }
  
  saveData();
  return sessions;
}

export function updateSession(id, sessionData) {
  const index = state.sessions.findIndex(s => s.id === id);
  if (index !== -1) {
    state.sessions[index] = {
      ...state.sessions[index],
      ...sessionData
    };
    saveData();
    return state.sessions[index];
  }
  return null;
}

export function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  saveData();
}

export function deleteRecurringSessions(groupId) {
  if (!groupId) return;
  state.sessions = state.sessions.filter(s => s.recurrenceGroupId !== groupId);
  saveData();
}

// --- 수업료/결제(Payment) 관련 CRUD ---
export function addPayment(paymentData) {
  const newPayment = {
    id: generateUUID(),
    studentId: paymentData.studentId,
    courseId: paymentData.courseId, // 어떤 과목에 청구된 금액인지 저장
    amount: Number(paymentData.amount) || 0,
    dueDate: paymentData.dueDate, // YYYY-MM-DD
    paidDate: paymentData.paidDate || null, // YYYY-MM-DD
    status: paymentData.status || 'unpaid', // 'unpaid' | 'paid'
    notes: paymentData.notes || ''
  };
  state.payments.push(newPayment);
  saveData();
  return newPayment;
}

export function updatePayment(id, paymentData) {
  const index = state.payments.findIndex(p => p.id === id);
  if (index !== -1) {
    state.payments[index] = {
      ...state.payments[index],
      ...paymentData,
      amount: Number(paymentData.amount) || state.payments[index].amount
    };
    saveData();
    return state.payments[index];
  }
  return null;
}

export function deletePayment(id) {
  state.sessions.forEach(s => {
    if (s.paymentId === id) {
      s.paymentId = null;
    }
  });
  state.payments = state.payments.filter(p => p.id !== id);
  saveData();
}

// --- 설정(Settings) 관련 ---
export function updateSettings(settingsData) {
  state.settings = {
    ...state.settings,
    ...settingsData,
    templates: {
      ...state.settings.templates,
      ...(settingsData.templates || {})
    }
  };
  saveData();
  return state.settings;
}

// B안에 맞는 전체 데이터 초기화 및 덤프 데이터 주입
export function seedDemoData() {
  localStorage.clear();
  
  const today = new Date();
  
  // 1. 김지민 학생 등록 (중국어, 수학 수강)
  const student1 = addStudent({
    name: '김지민',
    studentPhone: '010-1234-5678',
    studentKakaoId: 'jimin_chinese',
    parentName: '이지현 (모)',
    parentEmail: 'parent_jimin@example.com',
    parentPhone: '60162620030', // WhatsApp 테스트용 실존 포맷
    parentKakaoId: 'jeehyon_mom',
    notes: '중국어 회화 발음 교정 및 수학 기본 공식 정립 위주 수업 진행.'
  });

  const chineseCourse = addCourse(student1.id, {
    subject: '중국어',
    tuitionFee: 300000,
    tuitionCycle: 'monthly', // 매달 15일 결제
    tuitionCycleValue: 15,
    notes: '기초 중국어 회화 교재 사용'
  });

  const mathCourse = addCourse(student1.id, {
    subject: '수학',
    tuitionFee: 350000,
    tuitionCycle: 'count', // 횟수제
    tuitionCycleValue: 8,
    notes: '중2 수학 개념 완성 문제집 사용'
  });

  // 2. 박도현 학생 등록 (영어, HSK 수강)
  const student2 = addStudent({
    name: '박도현',
    studentPhone: '010-9876-5432',
    studentKakaoId: 'dohyun_p',
    parentName: '박준형 (부)',
    parentEmail: 'parent_dohyun@example.com',
    parentPhone: '821098765432',
    parentKakaoId: 'dohyun_dad',
    notes: '영어 독해력 향상 및 HSK 4급 취득 목표.'
  });

  const englishCourse = addCourse(student2.id, {
    subject: '영어',
    tuitionFee: 400000,
    tuitionCycle: 'monthly', // 매달 10일
    tuitionCycleValue: 10,
    notes: '고1 모의고사 기출문제 분석'
  });

  const hskCourse = addCourse(student2.id, {
    subject: 'HSK',
    tuitionFee: 350000,
    tuitionCycle: 'count', // 횟수제
    tuitionCycleValue: 8,
    notes: 'HSK 4급 한 권으로 끝내기 교재'
  });

  // 3. 최서아 학생 등록 (입시중국어 수강)
  const student3 = addStudent({
    name: '최서아',
    studentPhone: '010-5555-6666',
    studentKakaoId: 'seoa_c',
    parentName: '최윤서 (모)',
    parentEmail: 'parent_seoa@example.com',
    parentPhone: '821055556666',
    parentKakaoId: 'seoa_mom',
    notes: '외고 입시 대비 고급 중국어 작문 및 청취 훈련.'
  });

  const examChineseCourse = addCourse(student3.id, {
    subject: '입시중국어',
    tuitionFee: 500000,
    tuitionCycle: 'monthly', // 매달 20일
    tuitionCycleValue: 20,
    notes: '고난도 대입 수능 중국어 및 면접 구술 준비'
  });

  // 4. 결제 데이터 세팅
  // 김지민 수학 결제 내역 (1개 완납, 1개 미납)
  const payMathPaid = addPayment({
    studentId: student1.id,
    courseId: mathCourse.id,
    amount: 350000,
    dueDate: new Date(today.getFullYear(), today.getMonth() - 1, 10).toISOString().split('T')[0],
    paidDate: new Date(today.getFullYear(), today.getMonth() - 1, 9).toISOString().split('T')[0],
    status: 'paid',
    notes: '수학 1~8회차 과외비'
  });

  const payMathUnpaid = addPayment({
    studentId: student1.id,
    courseId: mathCourse.id,
    amount: 350000,
    dueDate: new Date(today.getFullYear(), today.getMonth() + 1, 5).toISOString().split('T')[0],
    paidDate: null,
    status: 'unpaid',
    notes: '수학 9~16회차 과외비'
  });

  // 김지민 중국어 결제 내역 (1개 미납)
  const payChineseUnpaid = addPayment({
    studentId: student1.id,
    courseId: chineseCourse.id,
    amount: 300000,
    dueDate: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0],
    paidDate: null,
    status: 'unpaid',
    notes: '중국어 7월분 과외비'
  });

  // 박도현 영어 결제 내역 (1개 미납)
  const payEnglishUnpaid = addPayment({
    studentId: student2.id,
    courseId: englishCourse.id,
    amount: 400000,
    dueDate: new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split('T')[0],
    paidDate: null,
    status: 'unpaid',
    notes: '영어 7월분 과외비'
  });

  // 최서아 입시중국어 결제 내역 (1개 미납)
  const payExamChineseUnpaid = addPayment({
    studentId: student3.id,
    courseId: examChineseCourse.id,
    amount: 500000,
    dueDate: new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0],
    paidDate: null,
    status: 'unpaid',
    notes: '입시중국어 7월분 과외비'
  });

  // 5. 세션(수업 일정) 데이터 세팅
  // 김지민 수학 수업 (화요일/목요일 매칭 - 결제완료 8회 + 대기/미납 4회)
  for (let i = 1; i <= 8; i++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - (24 - i * 2));
    sDate.setHours(16, 0, 0, 0);
    const eDate = new Date(sDate);
    eDate.setHours(18, 0, 0, 0);

    addSession({
      studentId: student1.id,
      courseId: mathCourse.id,
      title: `${student1.name} - ${mathCourse.subject}`,
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      attendance: i < 8 ? 'present' : 'late',
      attendanceNotified: true,
      notes: `수학 ${i}회차 수업 완료.`,
      isRecurring: true,
      paymentId: payMathPaid.id
    });
  }

  for (let i = 1; i <= 4; i++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - 2 + i * 2);
    sDate.setHours(16, 0, 0, 0);
    const eDate = new Date(sDate);
    eDate.setHours(18, 0, 0, 0);

    addSession({
      studentId: student1.id,
      courseId: mathCourse.id,
      title: `${student1.name} - ${mathCourse.subject}`,
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      attendance: i <= 1 ? 'present' : 'pending',
      attendanceNotified: i <= 1,
      notes: i <= 1 ? '수학 테스트 및 숙제 확인.' : '',
      isRecurring: true,
      paymentId: payMathUnpaid.id
    });
  }

  // 김지민 중국어 수업 (금요일 매칭 - 4회 예정)
  for (let i = 1; i <= 4; i++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - 5 + i * 7);
    sDate.setHours(14, 0, 0, 0);
    const eDate = new Date(sDate);
    eDate.setHours(16, 0, 0, 0);

    addSession({
      studentId: student1.id,
      courseId: chineseCourse.id,
      title: `${student1.name} - ${chineseCourse.subject}`,
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      attendance: sDate < today ? 'present' : 'pending',
      attendanceNotified: sDate < today,
      notes: sDate < today ? '성조 발음 교정 및 회화 교재 2단원 복습.' : '',
      isRecurring: true,
      paymentId: payChineseUnpaid.id
    });
  }

  // 박도현 영어 수업 (월요일/수요일 매칭 - 6회 예정)
  for (let i = 1; i <= 6; i++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - 10 + i * 3);
    sDate.setHours(19, 0, 0, 0);
    const eDate = new Date(sDate);
    eDate.setHours(21, 0, 0, 0);

    addSession({
      studentId: student2.id,
      courseId: englishCourse.id,
      title: `${student2.name} - ${englishCourse.subject}`,
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      attendance: sDate < today ? 'present' : 'pending',
      attendanceNotified: sDate < today,
      notes: sDate < today ? 'EBS 연계 교재 독해 분석 및 단어 테스트.' : '',
      isRecurring: true,
      paymentId: i <= 4 ? payEnglishUnpaid.id : null
    });
  }

  // 최서아 입시중국어 수업 (토요일 매칭 - 4회 예정)
  for (let i = 1; i <= 4; i++) {
    const sDate = new Date(today);
    sDate.setDate(today.getDate() - 6 + i * 7);
    sDate.setHours(10, 0, 0, 0);
    const eDate = new Date(sDate);
    eDate.setHours(12, 0, 0, 0);

    addSession({
      studentId: student3.id,
      courseId: examChineseCourse.id,
      title: `${student3.name} - ${examChineseCourse.subject}`,
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      attendance: sDate < today ? 'present' : 'pending',
      attendanceNotified: sDate < today,
      notes: sDate < today ? '고급 에세이 첨삭 및 작문 패턴 암기 테스트.' : '',
      isRecurring: true,
      paymentId: payExamChineseUnpaid.id
    });
  }

  loadData();
}
