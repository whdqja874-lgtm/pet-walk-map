import React, { useEffect } from 'react';

const KakaoLoginButton = () => {
  // ⚠️ 카카오 디벨로퍼스 앱 설정에서 확인한 JavaScript 키를 입력해주세요!
  // (기존 REST API 키가 아니라 'JavaScript 키'여야 SDK 로그인이 정상 작동합니다)
  const JAVASCRIPT_KEY = "134311da296aade3f691343d92d9f168"; // 본인의 JS 키로 변경 필요시 수정

  useEffect(() => {
    // 카카오 SDK 초기화
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(JAVASCRIPT_KEY);
    }
  }, []);

  const handleLogin = () => {
    if (!window.Kakao) {
      alert("카카오 SDK가 로드되지 않았습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }

    // 카카오 공식 팝업 로그인 실행
    window.Kakao.Auth.login({
      success: function (authObj) {
        // 로그인 성공 시 사용자 정보 가져오기 API 호출
        window.Kakao.API.request({
          url: '/v2/user/me',
          success: function (res) {
            const kakaoAccount = res.kakao_account;
            
            // 카카오 프로필 정보에서 닉네임과 프로필 사진 추출
            const nickname = kakaoAccount?.profile?.nickname || `집사_${Math.floor(Math.random() * 1000)}`;
            const profileImageUrl = kakaoAccount?.profile?.profile_image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150';

            // 로컬 스토리지에 로그인 정보 및 진짜 프로필 사진 저장
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('pet_map_user', nickname);
            localStorage.setItem('pet_map_profile_image', profileImageUrl);

            alert(`${nickname}님, 카카오 로그인 및 프로필 연동 성공! 🐾`);
            
            // 메인 화면을 새로고침하여 프로필 적용 반영
            window.location.reload();
          },
          fail: function (error) {
            console.error("카카오 사용자 정보 가져오기 실패:", error);
            alert("카카오 프로필 정보를 가져오지 못했습니다.");
          },
        });
      },
      fail: function (err) {
        console.error("카카오 로그인 팝업 실패:", err);
      },
    });
  };

  return (
    <button 
      onClick={handleLogin}
      className="w-full flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] font-extrabold text-sm py-3 px-4 rounded-2xl shadow-md hover:bg-[#fdd835] transition-all cursor-pointer"
    >
      <span>💬</span> 카카오로 3초 만에 시작하기
    </button>
  );
};

export default KakaoLoginButton;