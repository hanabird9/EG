// 메인 애플리케이션 모듈
import { loadData, getSettings, updateSettings } from './db.js';
import { renderDashboard } from './dashboard.js';
import { renderCalendar } from './calendar.js';
import { renderStudents } from './students.js';
import { renderSettings } from './settings.js';

let activeTab = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
  // 1. 데이터베이스 초기화
  loadData();
  
  // 2. 테마 초기화
  initTheme();

  // 3. 네비게이션 탭 이벤트 설정
  setupNavigation();

  // 4. 초기 화면 렌더링
  switchTab(activeTab);
});

// 테마 초기화 및 로드
function initTheme() {
  const settings = getSettings();
  const theme = settings.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  
  // 테마 토글 버튼 설정 (헤더/사이드바에 있는 버튼)
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  themeToggleBtns.forEach(btn => {
    // 테마 상태에 맞춰 아이콘 렌더링
    updateThemeIcon(btn, theme);

    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      updateSettings({ theme: newTheme });
      
      themeToggleBtns.forEach(b => updateThemeIcon(b, newTheme));
      
      if (window.lucide) window.lucide.createIcons();
    });
  });
}

function updateThemeIcon(btn, theme) {
  if (theme === 'dark') {
    btn.innerHTML = `<i data-lucide="sun"></i>`;
  } else {
    btn.innerHTML = `<i data-lucide="moon"></i>`;
  }
}

// 탭 네비게이션 설정
function setupNavigation() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // 액티브 클래스 이동
      tabBtns.forEach(b => b.classList.remove('active'));
      
      // 데스크톱 사이드바와 모바일 하단바가 분리되어 있으므로 동일한 탭의 모든 버튼을 active 처리
      const targetTab = btn.dataset.tab;
      document.querySelectorAll(`.nav-tab-btn[data-tab="${targetTab}"]`).forEach(b => b.classList.add('active'));
      
      switchTab(targetTab);
    });
  });
}

// 특정 탭으로 전환 및 화면 렌더링
function switchTab(tabId) {
  activeTab = tabId;
  
  // 모든 뷰 컨테이너 숨김
  document.querySelectorAll('.tab-content').forEach(view => {
    view.classList.remove('active');
  });
  
  // 타겟 뷰 컨테이너 보임
  const targetView = document.getElementById(`${tabId}-view`);
  if (targetView) {
    targetView.classList.add('active');
    
    // 각 탭에 따른 모듈 렌더링 함수 실행
    if (tabId === 'dashboard') {
      renderDashboard(targetView);
    } else if (tabId === 'calendar') {
      renderCalendar(targetView);
    } else if (tabId === 'students') {
      // 학생관리 탭에 들어갈 때 상세조회 상태 리셋 처리
      // 단, 사용자가 상세조회에서 나가지 않았으면 해당 상세페이지가 나오도록 함
      renderStudents(targetView);
    } else if (tabId === 'settings') {
      renderSettings(targetView);
    }
  }

  // 아이콘 리프레시
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
