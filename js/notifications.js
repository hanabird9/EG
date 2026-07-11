// 알림 발송 유틸리티 모듈

// 플레이스홀더 치환 함수
export function formatMessage(template, student, session) {
  if (!template) return '';
  
  const startTime = new Date(session.startTime);
  const formattedDate = `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`;
  const formattedTime = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
  
  const dateStr = `${startTime.getMonth() + 1}월 ${startTime.getDate()}일 (${getDayOfWeekStr(startTime)}) ${formattedTime}`;
  
  let attendanceStr = '출석';
  if (session.attendance === 'late') attendanceStr = '지각';
  if (session.attendance === 'absent') attendanceStr = '결석';
  if (session.attendance === 'pending') attendanceStr = '예정';

  // 수강 과목 매핑 조회
  const course = student.courses ? student.courses.find(c => c.id === session.courseId) : null;
  const courseSubject = course ? course.subject : '과외';

  return template
    .replace(/\[학생이름\]/g, student.name)
    .replace(/\[과목\]/g, courseSubject)
    .replace(/\[수업일자\]/g, dateStr)
    .replace(/\[출결상태\]/g, attendanceStr)
    .replace(/\[수업내용\]/g, session.notes || '별도의 수업 코멘트가 없습니다.');
}

function getDayOfWeekStr(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
}

// 이메일 발송 처리
export async function sendEmailNotification(student, session, settings) {
  const template = settings.templates?.email;
  const message = formatMessage(template, student, session);
  
  const course = student.courses ? student.courses.find(c => c.id === session.courseId) : null;
  const courseSubject = course ? course.subject : '과외';
  const subject = `[출결 알림] ${student.name} 학생의 수업 안내 (${courseSubject})`;
  
  // 1. Google Apps Script 연동이 되어 있으면 발송 시도 (서버리스 지메일 발송)
  if (settings.emailService?.provider === 'gmail-gas' && settings.emailService?.gmailGasUrl) {
    try {
      const response = await fetch(settings.emailService.gmailGasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain' // CORS preflight 방지를 위해 text/plain 사용
        },
        body: JSON.stringify({
          to: student.parentEmail,
          subject: subject,
          html: message.replace(/\n/g, '<br>')
        })
      });
      
      const resData = await response.json();
      if (response.ok && resData.success) {
        return { success: true, method: 'gmail-gas' };
      } else {
        throw new Error(resData.error || 'Google Apps Script 발송 에러');
      }
    } catch (error) {
      console.error('Google Apps Script 발송 실패, mailto로 백업 실행:', error);
      alert(`지메일(Apps Script) 자동 발송에 실패했습니다:\n[오류 내용] ${error.message}\n\n기본 이메일 앱(mailto)으로 전환하여 발송을 계속합니다.`);
      triggerMailto(student.parentEmail, subject, message);
      return { success: true, method: 'mailto', fallback: true, error: error.message };
    }
  }
  // 2. Resend 설정이 되어 있으면 로컬 프록시 API를 통해 발송 시도
  else if (settings.emailService?.provider === 'resend' && settings.emailService?.resendApiKey) {
    try {
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
          html: message.replace(/\n/g, '<br>') // 이메일 폼에 맞춰 줄바꿈 치환
        })
      });
      
      if (response.ok) {
        return { success: true, method: 'resend' };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Resend 발송 에러');
      }
    } catch (error) {
      console.error('Resend 발송 실패, mailto로 백업 실행:', error);
      alert(`Resend 자동 메일 발송에 실패했습니다:\n[오류 내용] ${error.message}\n\n시스템 보호를 위해 기본 이메일 앱(mailto)으로 전환하여 발송을 계속합니다.`);
      triggerMailto(student.parentEmail, subject, message);
      return { success: true, method: 'mailto', fallback: true, error: error.message };
    }
  } 
  // 2. EmailJS 설정이 되어 있으면 자동 발송 시도
  else if (settings.emailService?.provider === 'emailjs' && 
      settings.emailService?.emailjsServiceId && 
      settings.emailService?.emailjsTemplateId && 
      settings.emailService?.emailjsUserId) {
    try {
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
            message: message
          }
        })
      });
      
      if (response.ok) {
        return { success: true, method: 'emailjs' };
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('EmailJS 발송 실패, mailto로 백업 실행:', error);
      triggerMailto(student.parentEmail, subject, message);
      return { success: true, method: 'mailto', fallback: true, error: error.message };
    }
  } 
  // 3. 설정이 없거나 실패하면 메일 클라이언트 띄우기 (mailto)
  else {
    triggerMailto(student.parentEmail, subject, message);
    return { success: true, method: 'mailto' };
  }
}

function triggerMailto(email, subject, body) {
  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_self');
}

// WhatsApp 발송 처리 (wa.me 링크 연동)
export function sendWhatsAppNotification(student, session, settings) {
  const template = settings.templates?.whatsapp;
  const message = formatMessage(template, student, session);
  
  // 전화번호에서 공백, 하이픈 등 특수 기호 제거
  let phone = student.parentPhone.replace(/[^0-9]/g, '');
  
  // 만약 010으로 시작하는 한국 번호라면 국가번호 82로 변경
  if (phone.startsWith('010')) {
    phone = '82' + phone.substring(1);
  }
  
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  return { success: true };
}

// 카카오톡 발송 처리 (복사 및 카톡 실행)
export async function sendKakaoTalkNotification(student, session, settings) {
  const template = settings.templates?.kakaotalk;
  const message = formatMessage(template, student, session);
  
  try {
    // 클립보드 복사
    await navigator.clipboard.writeText(message);
    
    // 모바일 환경 등에서 카카오톡 앱 열기 시도 (iOS/Android 스키마)
    // 안전을 위해 팝업으로 안내한 다음 열도록 하거나 대화방 이동용 링크를 띄울 수 있음.
    // kakaotalk://open 은 모바일 기기에서 카카오톡 실행
    return { success: true, message: message };
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    return { success: false, error: err };
  }
}
