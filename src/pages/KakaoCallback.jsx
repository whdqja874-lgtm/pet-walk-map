import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const KakaoCallback = () => {
  const navigate = useNavigate();
  const [showSetupModal, setShowSetupModal] = useState(false);
  
  const [nicknameInput, setNicknameInput] = useState('');
  const [genderInput, setGenderInput] = useState('여성');
  const [dogBreedInput, setDogBreedInput] = useState('');
  
  const [profileImgInput, setProfileImgInput] = useState('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150');
  const [errorMessage, setErrorMessage] = useState('');
  
  const isProcessed = useRef(false);

  useEffect(() => {
    if (isProcessed.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (!code) {
      alert("로그인 코드가 존재하지 않습니다.");
      navigate('/', { replace: true });
      return;
    }

    isProcessed.current = true;

    const getKakaoUserInfo = async (authCode) => {
      try {
        const REST_API_KEY = "134311da296aade3f691343d92d9f168";
        const REDIRECT_URI = "http://localhost:5173/oauth/kakao/callback";

        const tokenResponse = await fetch(`https://kauth.kakao.com/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: REST_API_KEY,
            redirect_uri: REDIRECT_URI,
            code: authCode,
          }),
        });

        const tokenData = await tokenResponse.json();
        
        let kakaoNickname = '';
        if (tokenData.access_token) {
          const userResponse = await fetch(`https://kapi.kakao.com/v2/user/me`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
          });

          const userData = await userResponse.json();
          const kakaoAccount = userData.kakao_account;
          kakaoNickname = kakaoAccount?.profile?.nickname || '';
        }

        // 이미 기존에 상세 정보(프로필)가 저장된 유저인지 확인
        const savedUserProfile = localStorage.getItem('pet_map_user_profile');
        if (savedUserProfile) {
          const parsed = JSON.parse(savedUserProfile);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('pet_map_user', parsed.nickname);
          navigate('/', { replace: true });
        } else {
          if (kakaoNickname) {
            setNicknameInput(kakaoNickname);
          }
          setShowSetupModal(true);
        }

      } catch (error) {
        console.error("카카오 로그인 통신 중 오류 발생:", error);
        const savedUserProfile = localStorage.getItem('pet_map_user_profile');
        if (savedUserProfile) {
          const parsed = JSON.parse(savedUserProfile);
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('pet_map_user', parsed.nickname);
          navigate('/', { replace: true });
        } else {
          setShowSetupModal(true);
        }
      }
    };

    getKakaoUserInfo(code);
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImgInput(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    const trimmedNickname = nicknameInput.trim();

    if (!trimmedNickname) {
      setErrorMessage('닉네임을 입력해주세요!');
      return;
    }

    if (!dogBreedInput.trim()) {
      setErrorMessage('키우는 강아지 종(품종)을 입력해주세요!');
      return;
    }

    const existingUsersJSON = localStorage.getItem('pet_map_all_users') || '[]';
    const existingUsers = JSON.parse(existingUsersJSON);
    
    if (existingUsers.includes(trimmedNickname)) {
      setErrorMessage('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요!');
      return;
    }

    existingUsers.push(trimmedNickname);
    localStorage.setItem('pet_map_all_users', JSON.stringify(existingUsers));

    const userProfile = {
      nickname: trimmedNickname,
      gender: genderInput,
      dogBreed: dogBreedInput.trim(),
      profileImg: profileImgInput
    };

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('pet_map_user', trimmedNickname);
    localStorage.setItem('pet_map_user_profile', JSON.stringify(userProfile));

    alert(`${trimmedNickname}님, 댕냥맵 설정 완료! 환영합니다 🐾`);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fff5f5] text-[#4c0519] font-extrabold gap-3 relative">
      {!showSetupModal && (
        <>
          <div className="animate-spin text-3xl">🐾</div>
          <p>카카오 계정 정보를 불러오는 중입니다...</p>
        </>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-7 max-w-sm w-full shadow-2xl border border-rose-100 flex flex-col gap-4 animate-fade-in">
            <div className="text-center space-y-1">
              <span className="text-3xl">✨</span>
              <h3 className="text-xl font-black text-rose-950">추가 정보 설정</h3>
              <p className="text-xs text-stone-500 font-medium">프로필과 댕댕이 정보를 입력해 주세요!</p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-[11px] p-2.5 rounded-xl text-center font-bold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSetupSubmit} className="space-y-3.5">
              <div className="flex flex-col items-center gap-2 pb-1">
                <div className="relative group cursor-pointer">
                  <img 
                    src={profileImgInput} 
                    alt="프로필 미리보기" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 shadow-md"
                  />
                  <label htmlFor="profile-upload" className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    변경
                  </label>
                </div>
                <input 
                  id="profile-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
                <label htmlFor="profile-upload" className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer">
                  프로필 사진 직접 등록하기 📷
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-stone-700">닉네임 (중복 불가)</label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => { setNicknameInput(e.target.value); setErrorMessage(''); }}
                  placeholder="예: 초코맘"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-500 bg-stone-50 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-stone-700">성별</label>
                <select
                  value={genderInput}
                  onChange={(e) => setGenderInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-500 bg-stone-50 font-bold text-stone-700"
                >
                  <option value="여성">여성</option>
                  <option value="남성">남성</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-stone-700">키우는 강아지 종 (품종)</label>
                <input
                  type="text"
                  value={dogBreedInput}
                  onChange={(e) => { setDogBreedInput(e.target.value); setErrorMessage(''); }}
                  placeholder="예: 말티즈, 포메라니안"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-500 bg-stone-50 font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all mt-2"
              >
                저장하고 시작하기 🐾
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KakaoCallback;