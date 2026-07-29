import { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import KakaoCallback from './pages/KakaoCallback';
import './App.css';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '방금 전';
  
  const now = Date.now();
  const elapsedMinutes = Math.floor((now - timestamp) / (1000 * 60));

  if (elapsedMinutes < 1) return '방금 전';
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;
  
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;
  
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}일 전`;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function AppMain() {
  const [mainTab, setMainTab] = useState('map'); 
  
  // 1번 수정: 최초 접속 시 자동으로 '테스트유저'가 되지 않도록 기본값을 비워둡니다.
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return localStorage.getItem('pet_map_user') || ''; 
    } catch (e) {
      return '';
    }
  });

  // 1번 수정: 프로필 역시 로그인하지 않았다면 기본값으로 null을 가집니다.
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('pet_map_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [userLocation, setUserLocation] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editGender, setEditGender] = useState('여성');
  const [editDogBreed, setEditDogBreed] = useState('');
  const [editProfileImg, setEditProfileImg] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('pet_map_user');
    if (savedUser) setCurrentUser(savedUser);
    const savedProfile = localStorage.getItem('pet_map_user_profile');
    if (savedProfile) setUserProfile(JSON.parse(savedProfile));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('위치 정보를 가져오지 못했습니다.', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const [walkPosts, setWalkPosts] = useState(() => {
    try {
      const savedPosts = localStorage.getItem('pet_map_walk_posts');
      return savedPosts ? JSON.parse(savedPosts) : [];
    } catch (e) {
      return [];
    }
  });

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState('동네산책 같이해요'); 
  const [walkFilterType, setWalkFilterType] = useState('all'); 
  const [walkScopeFilter, setWalkScopeFilter] = useState('all'); 

  const [editingPostId, setEditingPostId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  const mapContainer = useRef(null);
  const mapRef = useRef(null); 
  const markersRef = useRef([]); 
  const currentOverlayRef = useRef(null);
  const currentOverlayPlaceIdRef = useRef(null);
  const gpsMarkerRef = useRef(null);
  
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [reviewInput, setReviewInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  const reviewsStorageRef = useRef(() => {
    try {
      const savedReviews = localStorage.getItem('pet_map_reviews');
      return savedReviews ? JSON.parse(savedReviews) : {};
    } catch (e) {
      return {};
    }
  });

  if (typeof reviewsStorageRef.current === 'function') {
    reviewsStorageRef.current = reviewsStorageRef.current();
  }

  const allFetchedPlacesRef = useRef([]);
  const activeFilterRef = useRef(activeFilter);
  
  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  const filterOptions = [
    { id: 'all', label: '✨ 전체' },
    { id: 'hospital', label: '🏥 동물병원', keyword: '동물병원' },
    { id: 'cafe', label: '☕ 애견카페', keyword: '애견카페' },
    { id: 'beauty', label: '✂️ 애견미용', keyword: '애견미용' },
    { id: 'shop', label: '🧸 애견용품', keyword: '애견용품' },
    { id: 'friendly', label: '🐾 반려동물동반', keyword: '반려동물동반' },
  ];

  const handleKakaoLogin = () => {
    const REST_API_KEY = "134311da296aade3f691343d92d9f168";
    const REDIRECT_URI = "https://pet-walk-map.vercel.app/oauth/kakao/callback";
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  const handleLogout = () => {
    setCurrentUser('');
    setUserProfile(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('pet_map_user');
    localStorage.removeItem('pet_map_user_profile');
  };

  const openEditModal = () => {
    if (userProfile) {
      setEditNickname(userProfile.nickname);
      setEditGender(userProfile.gender || '여성');
      setEditDogBreed(userProfile.dogBreed || '');
      setEditProfileImg(userProfile.profileImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150');
    } else {
      setEditNickname(currentUser);
      setEditGender('여성');
      setEditDogBreed('');
      setEditProfileImg('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150');
    }
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditProfileImg(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const trimmed = editNickname.trim();
    if (!trimmed || !editDogBreed.trim()) {
      setEditError('닉네임과 강아지 종을 모두 입력해주세요.');
      return;
    }

    if (trimmed !== userProfile?.nickname) {
      const allUsers = JSON.parse(localStorage.getItem('pet_map_all_users') || '[]');
      if (allUsers.includes(trimmed)) {
        setEditError('이미 사용 중인 닉네임입니다.');
        return;
      }
      allUsers.push(trimmed);
      localStorage.setItem('pet_map_all_users', JSON.stringify(allUsers));
    }

    const updatedProfile = {
      ...userProfile,
      nickname: trimmed,
      gender: editGender,
      dogBreed: editDogBreed.trim(),
      profileImg: editProfileImg
    };

    setUserProfile(updatedProfile);
    setCurrentUser(trimmed);
    localStorage.setItem('pet_map_user', trimmed);
    localStorage.setItem('pet_map_user_profile', JSON.stringify(updatedProfile));
    setIsEditModalOpen(false);
    alert('정보가 성공적으로 수정되었습니다! ✨');
  };

  useEffect(() => {
    if (mainTab !== 'map') return;

    const timer = setTimeout(() => {
      if (!mapContainer.current) return;

      if (!mapRef.current) {
        const centerPosition = new window.kakao.maps.LatLng(37.1995, 126.9271); 
        const options = { center: centerPosition, level: 4 };
        const map = new window.kakao.maps.Map(mapContainer.current, options);
        mapRef.current = map;

        const ps = new window.kakao.maps.services.Places(); 

        function searchPlacesInCurrentMap() {
          const currentBounds = map.getBounds();
          const currentCenter = map.getCenter();
          const keywords = ['애견카페', '동물병원', '애견미용', '애견용품', '반려동물동반'];
          let completedSearches = 0;
          let tempNewPlaces = [];

          keywords.forEach(keyword => {
            ps.keywordSearch(keyword, (data, status) => {
              completedSearches++;
              if (status === window.kakao.maps.services.Status.OK) {
                data.forEach((place) => {
                  const placePosition = new window.kakao.maps.LatLng(place.y, place.x);
                  if (currentBounds.contain(placePosition)) {
                    const existingInTemp = tempNewPlaces.find(item => item.id === place.id);
                    if (existingInTemp) {
                      if (!existingInTemp.searchKeywords.includes(keyword)) {
                        existingInTemp.searchKeywords.push(keyword);
                      }
                    } else {
                      place.searchKeywords = [keyword];
                      tempNewPlaces.push(place);
                    }
                  }
                  if (!reviewsStorageRef.current[place.id]) {
                    reviewsStorageRef.current[place.id] = [];
                  }
                });
              }

              if (completedSearches === keywords.length) {
                tempNewPlaces.forEach(newP => {
                  const globalExist = allFetchedPlacesRef.current.find(item => item.id === newP.id);
                  if (!globalExist) {
                    allFetchedPlacesRef.current.push(newP);
                  } else {
                    newP.searchKeywords.forEach(kw => {
                      if (!globalExist.searchKeywords.includes(kw)) {
                        globalExist.searchKeywords.push(kw);
                      }
                    });
                  }
                });
                if (allFetchedPlacesRef.current.length > 150) {
                  allFetchedPlacesRef.current = allFetchedPlacesRef.current.slice(-150);
                }
                updateMarkersByFilter(activeFilterRef.current);
              }
            }, { bounds: currentBounds, location: currentCenter });
          });
        }

        window.kakao.maps.event.addListener(map, 'idle', searchPlacesInCurrentMap);
        window.kakao.maps.event.trigger(map, 'idle');
      } else {
        mapRef.current.relayout();
        window.kakao.maps.event.trigger(mapRef.current, 'idle');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [mainTab]);

  const updateMarkersByFilter = (filterTarget) => {
    const map = mapRef.current;
    if (!map) return;

    const activeId = currentOverlayPlaceIdRef.current;
    let keepOverlay = null;

    markersRef.current.forEach(item => {
      if (item.markerOverlay) item.markerOverlay.setMap(null);
      if (item.detailOverlay) {
        if (item.id === activeId) {
          keepOverlay = item.detailOverlay;
        } else {
          item.detailOverlay.setMap(null);
        }
      }
    });
    markersRef.current = [];

    const selectedOption = filterOptions.find(opt => opt.id === filterTarget);
    const filtered = allFetchedPlacesRef.current.filter(place => {
      if (filterTarget === 'all') return true;
      if (!place.searchKeywords) return false;
      if (filterTarget === 'friendly') {
        const isPurePetFacility = place.category_name.includes('동물') || 
                                  place.category_name.includes('애견') || 
                                  place.category_name.includes('반려');
        return !isPurePetFacility && place.searchKeywords.includes('반려동물동반');
      }
      return place.searchKeywords.includes(selectedOption.keyword);
    });

    const currentBounds = map.getBounds();
    filtered.forEach(place => {
      const placePosition = new window.kakao.maps.LatLng(place.y, place.x);
      if (currentBounds.contain(placePosition)) {
        displayCustomMarkerAndOverlay(place);
      }
    });

    if (keepOverlay && currentOverlayRef.current) {
      currentOverlayRef.current.setMap(map);
    } else if (!filtered.some(p => p.id === activeId)) {
      if (currentOverlayRef.current) {
        currentOverlayRef.current.setMap(null);
        currentOverlayRef.current = null;
        currentOverlayPlaceIdRef.current = null;
      }
    }
  };

  useEffect(() => {
    updateMarkersByFilter(activeFilter);
  }, [activeFilter]);

  function displayCustomMarkerAndOverlay(place) {
    const map = mapRef.current;
    if (!map) return;
    const markerPosition = new window.kakao.maps.LatLng(place.y, place.x);
    const isPurePetFacility = place.category_name.includes('동물') || place.category_name.includes('애견') || place.category_name.includes('반려');
    const pinColor = isPurePetFacility ? '#e11d48' : '#e2d9db'; 
    const lastCategory = place.category_name.split(' > ').pop();
    const tagText = isPurePetFacility ? lastCategory : `${lastCategory} (동반 🐾)`;

    const markerContent = document.createElement('div');
    markerContent.className = 'pet-paw-marker';
    markerContent.innerHTML = `
      <svg viewBox="0 0 100 100" class="paw-svg">
        <path d="M50,95 C15,65 10,45 10,35 A40,40 0 1,1 90,35 C90,45 85,65 50,95 Z" fill="${pinColor}" class="paw-pin-bg"/>
        <circle cx="50" cy="42" r="14" class="paw-pad"/>
        <circle cx="28" cy="24" r="8" class="paw-toe"/>
        <circle cx="43" cy="15" r="9" class="paw-toe"/>
        <circle cx="57" cy="15" r="9" class="paw-toe"/>
        <circle cx="72" cy="24" r="8" class="paw-toe"/>
      </svg>
    `;

    const overlayContent = document.createElement('div');
    overlayContent.className = 'pet-map-container';
    overlayContent.onclick = (e) => e.stopPropagation();

    const cardSimple = document.createElement('div');
    cardSimple.className = 'pet-map-card-simple';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'pet-sidebar-close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '12px';
    closeBtn.style.right = '12px';
    closeBtn.style.width = '24px';
    closeBtn.style.height = '24px';
    closeBtn.style.fontSize = '12px';
    closeBtn.innerText = '✕';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      detailOverlay.setMap(null);
      if (currentOverlayRef.current === detailOverlay) {
        currentOverlayRef.current = null;
        currentOverlayPlaceIdRef.current = null;
      }
    });

    const title = document.createElement('strong');
    title.innerText = place.place_name;

    const tag = document.createElement('span');
    tag.className = `pet-map-tag ${isPurePetFacility ? 'facility' : 'friendly'}`;
    tag.innerText = tagText;

    const infoBox = document.createElement('div');
    infoBox.className = 'pet-map-preview-info';
    
    const address = document.createElement('p');
    address.className = 'preview-address';
    address.innerText = `📍 ${place.address_name}`;
    infoBox.appendChild(address);

    if (place.phone) {
      const phone = document.createElement('p');
      phone.className = 'preview-phone';
      phone.innerText = `📞 ${place.phone}`;
      infoBox.appendChild(phone);
    }

    const detailBtn = document.createElement('button');
    detailBtn.className = 'pet-map-btn';
    detailBtn.innerText = '상세보기 ✨';

    const detailOverlay = new window.kakao.maps.CustomOverlay({
      content: overlayContent, 
      position: markerPosition,
      yAnchor: 1.6, 
      zIndex: 10, 
      clickable: true
    });

    detailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setSelectedPlace({
        id: place.id,
        place_name: place.place_name,
        address_name: place.address_name,
        phone: place.phone || '',
        place_url: place.place_url,
        tagText: tagText,
        isPurePetFacility,
        reviews: reviewsStorageRef.current[place.id] || []
      });
      setActiveTab('info');
      detailOverlay.setMap(null); 
    });

    const arrow = document.createElement('div');
    arrow.className = 'pet-map-arrow';

    cardSimple.appendChild(closeBtn);
    cardSimple.appendChild(title);
    cardSimple.appendChild(tag);
    cardSimple.appendChild(infoBox); 
    cardSimple.appendChild(detailBtn);
    overlayContent.appendChild(cardSimple);
    overlayContent.appendChild(arrow);

    markerContent.onclick = (e) => {
      e.stopPropagation();
      if (currentOverlayRef.current) currentOverlayRef.current.setMap(null); 

      detailOverlay.setMap(map); 
      currentOverlayRef.current = detailOverlay;
      currentOverlayPlaceIdRef.current = place.id;
    };

    const markerOverlay = new window.kakao.maps.CustomOverlay({
      position: markerPosition,
      content: markerContent,
      yAnchor: 0.95,
      zIndex: 1 
    });
    
    markerOverlay.setMap(map);
    markersRef.current.push({ id: place.id, markerOverlay, detailOverlay });
  }

  const handleMoveToCurrentLocation = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 정보(GPS)를 지원하지 않습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const locPosition = new window.kakao.maps.LatLng(lat, lon);

        setUserLocation({ lat, lng: lon });
        map.panTo(locPosition);

        if (gpsMarkerRef.current) gpsMarkerRef.current.setMap(null);

        const gpsContent = document.createElement('div');
        gpsContent.className = 'pet-gps-marker';
        gpsContent.innerHTML = `<div class="gps-pulse"></div><div class="gps-dot"></div>`;

        const gpsOverlay = new window.kakao.maps.CustomOverlay({
          position: locPosition,
          content: gpsContent,
          yAnchor: 0.5,
          zIndex: 5
        });

        gpsOverlay.setMap(map);
        gpsMarkerRef.current = gpsOverlay;
      },
      (error) => {
        console.error(error);
        alert('위치 정보를 가져올 수 없습니다.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleReviewSubmit = () => {
    if (!currentUser) {
      alert('로그인 후 이용 가능합니다!');
      return;
    }
    if (!reviewInput.trim() || !selectedPlace) return;

    const breedDisplay = userProfile?.dogBreed ? ` (${userProfile.dogBreed} 🐾)` : ' 🐾';
    const newReview = {
      id: Date.now(),
      user: `${currentUser}${breedDisplay}`, 
      userImg: userProfile?.profileImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150',
      text: reviewInput.trim(),
      time: '방금 전' 
    };

    const updatedReviews = [newReview, ...(reviewsStorageRef.current[selectedPlace.id] || [])];
    reviewsStorageRef.current[selectedPlace.id] = updatedReviews;

    try {
      localStorage.setItem('pet_map_reviews', JSON.stringify(reviewsStorageRef.current));
    } catch (e) {
      console.error('저장 실패:', e);
    }

    setSelectedPlace(prev => prev ? { ...prev, reviews: updatedReviews } : null);
    setReviewInput('');
  };

  const handleCreateWalkPost = (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('로그인 후 글을 작성할 수 있습니다!');
      return;
    }
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const breedDisplay = userProfile?.dogBreed ? ` (${userProfile.dogBreed} 🐾)` : ' 🐾';
    const currentLoc = userLocation || { lat: 37.1995, lng: 126.9271 };

    if (editingPostId) {
      const updated = walkPosts.map(post => {
        if (post.id === editingPostId) {
          return {
            ...post,
            title: newPostTitle.trim(),
            content: newPostContent.trim(),
            postType: newPostType
          };
        }
        return post;
      });
      setWalkPosts(updated);
      try {
        localStorage.setItem('pet_map_walk_posts', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      setEditingPostId(null);
      setNewPostTitle('');
      setNewPostContent('');
      alert('산책 모집글이 수정되었습니다! ✨');
      return;
    }

    const newPost = {
      id: Date.now(),
      rawAuthor: currentUser,
      author: `${currentUser}${breedDisplay}`,
      authorGender: userProfile?.gender || '여성',
      authorImg: userProfile?.profileImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150',
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
      postType: newPostType, 
      lat: currentLoc.lat,
      lng: currentLoc.lng,
      timestamp: Date.now(),
      comments: []
    };

    const updated = [newPost, ...walkPosts];
    setWalkPosts(updated);
    try {
      localStorage.setItem('pet_map_walk_posts', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setNewPostTitle('');
    setNewPostContent('');
  };

  const handleEditWalkPost = (post) => {
    if (currentUser !== post.rawAuthor) {
      alert('본인이 작성한 글만 수정할 수 있습니다!');
      return;
    }
    setEditingPostId(post.id);
    setNewPostTitle(post.title);
    setNewPostContent(post.content);
    setNewPostType(post.postType || '동네산책 같이해요');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setNewPostTitle('');
    setNewPostContent('');
  };

  const handleDeleteWalkPost = (postId, postRawAuthor) => {
    if (currentUser !== postRawAuthor) {
      alert('본인이 작성한 글만 삭제할 수 있습니다!');
      return;
    }

    if (window.confirm('정말 이 산책 모집글을 삭제하시겠습니까?')) {
      const updated = walkPosts.filter(p => p.id !== postId);
      setWalkPosts(updated);
      try {
        localStorage.setItem('pet_map_walk_posts', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      if (editingPostId === postId) handleCancelEdit();
    }
  };

  const handleCommentSubmit = (postId) => {
    if (!currentUser) {
      alert('로그인 후 댓글을 작성할 수 있습니다!');
      return;
    }
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const breedDisplay = userProfile?.dogBreed ? ` (${userProfile.dogBreed} 🐾)` : ' 🐾';
    const updatedPosts = walkPosts.map(post => {
      if (post.id === postId) {
        const newComment = {
          id: Date.now(),
          author: `${currentUser}${breedDisplay}`,
          authorGender: userProfile?.gender || '여성',
          authorImg: userProfile?.profileImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150',
          text: text.trim(),
          timestamp: Date.now()
        };
        return { ...post, comments: [...post.comments, newComment] };
      }
      return post;
    });

    setWalkPosts(updatedPosts);
    try {
      localStorage.setItem('pet_map_walk_posts', JSON.stringify(updatedPosts));
    } catch (e) {
      console.error(e);
    }
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const filteredWalkPosts = walkPosts.filter(post => {
    if (walkFilterType !== 'all' && post.postType !== walkFilterType) return false;
    if (walkScopeFilter === 'local') {
      if (!userLocation) return false;
      const distance = calculateDistance(userLocation.lat, userLocation.lng, post.lat || userLocation.lat, post.lng || userLocation.lng);
      if (distance > 10) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fff9fa] overflow-hidden relative font-sans antialiased text-stone-800 pb-20 md:pb-0">
      
      {/* 데스크톱/태블릿 헤더 */}
      <header className="hidden md:flex h-16 bg-white/85 backdrop-blur-md border-b border-rose-100/60 items-center justify-between px-6 z-40 shrink-0 shadow-xs">
        <div className="flex items-center bg-rose-50/80 p-1 rounded-2xl border border-rose-100/60">
          <button
            onClick={() => setMainTab('map')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2 ${
              mainTab === 'map' ? 'bg-rose-600 text-white shadow-md shadow-rose-200 scale-105' : 'text-stone-500 hover:text-rose-600 hover:bg-rose-100/40'
            }`}
          >
            🗺️ <span>댕냥맵</span>
          </button>
          <button
            onClick={() => setMainTab('walk')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2 ${
              mainTab === 'walk' ? 'bg-rose-600 text-white shadow-md shadow-rose-200 scale-105' : 'text-stone-500 hover:text-rose-600 hover:bg-rose-100/40'
            }`}
          >
            🐾 <span>동네산책</span>
          </button>
        </div>

        {/* 2번 수정: 우측 상단 카카오 로그인 탭 상태 분기 명확화 */}
        <div className="flex items-center gap-3">
          {currentUser && userProfile ? (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-rose-100 shadow-xs">
              <div className="flex items-center gap-2">
                <img src={userProfile?.profileImg} alt="프로필" className="w-7 h-7 rounded-full object-cover border border-rose-200" />
                <span className="text-xs font-bold text-rose-950"><b>{currentUser}</b>님</span>
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <button onClick={openEditModal} className="text-[11px] font-bold text-rose-600 hover:underline">정보수정</button>
                <button onClick={handleLogout} className="text-[11px] font-bold text-stone-400 hover:text-rose-600">로그아웃</button>
              </div>
            </div>
          ) : (
            <button onClick={handleKakaoLogin} className="flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] font-extrabold text-xs py-2.5 px-4 rounded-2xl shadow-md transition-all hover:opacity-90">
              💬 카카오로 시작하기
            </button>
          )}
        </div>
      </header>

      {/* 모바일 최상단 유저 간이 바 */}
      <div className="md:hidden flex h-12 bg-white/95 border-b border-rose-100 items-center justify-between px-4 z-40 shrink-0">
        <span className="text-xs font-black text-rose-900 tracking-wider">🐾 댕냥크루</span>
        {currentUser && userProfile ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-600 font-bold">{currentUser}님</span>
            <button onClick={openEditModal} className="text-[10px] text-rose-600 font-bold px-2 py-0.5 bg-rose-50 rounded-md border border-rose-100">수정</button>
          </div>
        ) : (
          <button onClick={handleKakaoLogin} className="text-[10px] font-extrabold bg-[#FEE500] px-2.5 py-1 rounded-lg">💬 로그인</button>
        )}
      </div>

      <div className="flex-1 flex relative w-full h-full overflow-hidden">
        
        {/* 🗺️ 지도 탭 뷰 */}
        <div className={`absolute inset-0 flex flex-col md:flex-row w-full h-full transition-opacity duration-200 ${mainTab === 'map' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          
          {/* 지도 컨트롤 레이어 */}
          <div className="absolute top-3 left-0 right-0 z-30 flex items-center gap-2 px-3 overflow-x-auto no-scrollbar pointer-events-none select-none touch-pan-x">
            <button 
              onClick={handleMoveToCurrentLocation}
              className="bg-white text-rose-600 font-bold p-2.5 rounded-xl shadow-lg border border-rose-100 flex items-center justify-center pointer-events-auto shrink-0 touch-manipulation"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="flex gap-1.5 overflow-x-auto pointer-events-auto pb-1 max-w-full no-scrollbar">
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  className={`pet-filter-chip shrink-0 text-xs px-3 py-1.5 rounded-xl border font-bold transition-all shadow-sm ${
                    activeFilter === option.id ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white text-stone-600 border-stone-200'
                  }`}
                  onClick={() => setActiveFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 플레이스 상세 정보 사이드바 */}
          {selectedPlace && (
            <div className="pet-sidebar fixed md:absolute bottom-0 md:top-0 left-0 right-0 md:right-auto md:w-96 max-h-[60vh] md:max-h-full bg-white rounded-t-[2rem] md:rounded-none shadow-2xl flex flex-col z-40 animate-slide-in overflow-hidden">
              <button className="pet-sidebar-close absolute top-4 right-4 text-stone-400 font-bold z-50 p-2" onClick={() => setSelectedPlace(null)}>✕</button>
              
              <div className="pt-7 pb-3 px-6 flex flex-col items-center text-center shrink-0">
                <h2 className="text-base md:text-2xl font-black text-rose-950 tracking-tight leading-tight mb-1.5 max-w-[85%]">{selectedPlace.place_name}</h2>
                <span className={`pet-map-tag ${selectedPlace.isPurePetFacility ? 'facility' : 'friendly'}`}>
                  {selectedPlace.tagText}
                </span>
              </div>

              <div className="pet-modern-tab-box flex border-b border-stone-100 shrink-0">
                <button className={`flex-1 text-center py-2.5 text-xs font-bold ${activeTab === 'info' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-stone-400'}`} onClick={() => setActiveTab('info')}>
                  <span>✨ 플레이스</span>
                </button>
                <button className={`flex-1 text-center py-2.5 text-xs font-bold ${activeTab === 'review' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-stone-400'}`} onClick={() => setActiveTab('review')}>
                  <span>💬 집사토크 ({selectedPlace.reviews?.length || 0})</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
                {activeTab === 'info' ? (
                  <div className="space-y-3 py-1">
                    <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                      <span className="text-[10px] font-bold text-stone-400 block mb-0.5">도로명 주소</span>
                      <p className="text-xs text-stone-800 font-medium">{selectedPlace.address_name}</p>
                    </div>
                    {selectedPlace.phone && (
                      <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                        <span className="text-[10px] font-bold text-stone-400 block mb-0.5">연락처</span>
                        <p className="text-xs text-rose-600 font-black tracking-wider">{selectedPlace.phone}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <a href={selectedPlace.place_url} target="_blank" rel="noreferrer" className="block w-full text-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-3 rounded-xl shadow-md transition-colors">
                        카카오맵에서 더 자세히 보기 🗺️
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full min-h-[25vh]">
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1 pb-2">
                      {!selectedPlace.reviews || selectedPlace.reviews.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-xs text-stone-500 font-bold">아직 등록된 토크가 없어요. 첫 마디를 나누어보세요!</p>
                        </div>
                      ) : (
                        selectedPlace.reviews.map(r => (
                          <div key={r.id} className="bg-rose-50/50 p-2.5 rounded-2xl border border-rose-100/40">
                            <div className="flex items-center gap-2 mb-1">
                              <img src={r.userImg} alt="유저" className="w-5 h-5 rounded-full object-cover" />
                              <span className="text-[11px] font-bold text-stone-800">{r.user}</span>
                              <span className="text-[9px] text-stone-400 ml-auto">{r.time}</span>
                            </div>
                            <p className="text-xs text-stone-700 pl-7">{r.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="pt-2 bg-white border-t border-stone-100 shrink-0 flex gap-2">
                      <input 
                        type="text" value={reviewInput} onChange={(e) => setReviewInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleReviewSubmit()}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none"
                        placeholder={currentUser ? "매장 방문 후기를 남겨주세요 ✨" : "로그인 후 이용 가능합니다"} 
                      />
                      <button onClick={handleReviewSubmit} className="bg-stone-800 text-white px-3 py-2 text-xs font-bold rounded-xl shrink-0">등록</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <main className="flex-1 w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" />
          </main>
        </div>

        {/* 🐾 동네산책 피드 탭 뷰 */}
        <div className={`absolute inset-0 bg-[#fff5f6]/60 overflow-y-auto p-3 md:p-10 transition-opacity duration-200 ${mainTab === 'walk' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
            
            <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-pink-500 text-white p-5 md:p-7 rounded-[1.5rem] md:rounded-[2rem] shadow-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="inline-block bg-white/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-rose-100 mb-1">우리 동네 산책 크루 🐾</span>
                <h2 className="text-xl md:text-2xl font-black tracking-tight">동네 산책 메이트 찾기</h2>
                <p className="text-[11px] text-rose-100/90">이웃과 함께하는 안전하고 신나는 반려견 산책 모임</p>
              </div>
              <div className="text-4xl hidden sm:block bg-white/10 p-2.5 rounded-2xl">🐕</div>
            </div>

            {/* 작성 폼 */}
            <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-md border border-rose-100/80">
              <h3 className="text-xs md:text-sm font-black text-rose-950 mb-3 flex items-center gap-2">✍️ {editingPostId ? '글 수정하기' : '새 산책 메이트 모집'}</h3>
              {currentUser ? (
                <form onSubmit={handleCreateWalkPost} className="space-y-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button" onClick={() => setNewPostType('동네산책 같이해요')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${newPostType === '동네산책 같이해요' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'}`}
                    >
                      🐾 동네산책 같이해요
                    </button>
                    <button
                      type="button" onClick={() => setNewPostType('산책 대행')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${newPostType === '산책 대행' ? 'bg-sky-600 text-white' : 'bg-stone-100 text-stone-600'}`}
                    >
                      🚶‍♂️ 산책 대행
                    </button>
                  </div>

                  <input
                    type="text" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none"
                  />
                  <textarea
                    value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="시간, 장소, 반려견의 성향을 알려주세요 ✨" rows="2"
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none resize-none"
                  ></textarea>
                  <div className="flex justify-end gap-2">
                    {editingPostId && <button type="button" onClick={handleCancelEdit} className="px-4 py-2 bg-stone-100 text-xs font-bold rounded-xl">취소</button>}
                    <button type="submit" className="px-5 py-2 bg-rose-600 text-white text-xs font-black rounded-xl shadow-md">{editingPostId ? '수정 완료' : '등록하기'}</button>
                  </div>
                </form>
              ) : (
                <div className="py-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
                  🔒 로그인이 필요한 서비스입니다.
                </div>
              )}
            </div>

            {/* 필터 세션 */}
            <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-rose-100 shadow-xs">
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                {['all', '동네산책 같이해요', '산책 대행'].map(t => (
                  <button
                    key={t} onClick={() => setWalkFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 ${walkFilterType === t ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'}`}
                  >
                    {t === 'all' ? '전체유형' : t === '산책 대행' ? '🚶‍♂️ 대행' : '🐾 같이해요'}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 border-t border-stone-100 pt-2">
                <button onClick={() => setWalkScopeFilter('all')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${walkScopeFilter === 'all' ? 'bg-rose-600 text-white' : 'bg-stone-50 text-stone-600'}`}>🌍 전체글</button>
                <button onClick={() => setWalkScopeFilter('local')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg ${walkScopeFilter === 'local' ? 'bg-rose-600 text-white' : 'bg-stone-50 text-stone-600'}`}>🏠 내 동네 (10km)</button>
              </div>
            </div>

            {/* 실시간 피드 목록 */}
            <div className="space-y-3">
              {filteredWalkPosts.map(post => (
                <div key={post.id} className="bg-white p-4 md:p-6 rounded-[1.5rem] shadow-sm border border-rose-100/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-50 pb-2">
                    <div className="flex items-center gap-2">
                      <img src={post.authorImg} alt="유저" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-stone-900">{post.author}</span>
                          <span className="text-[9px] font-extrabold px-1 bg-rose-50 text-rose-600 rounded">{post.authorGender}</span>
                        </div>
                        <span className="text-[9px] text-stone-400 block">{formatRelativeTime(post.timestamp)}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${post.postType === '산책 대행' ? 'bg-sky-600' : 'bg-rose-600'}`}>{post.postType}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs md:text-sm font-black text-stone-900">{post.title}</h4>
                    <p className="text-[11px] md:text-xs text-stone-600 whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* 댓글 섹션 */}
                  <div className="bg-stone-50/70 p-3 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-stone-500 block">댓글 ({post.comments.length})</span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {post.comments.map(c => (
                        <div key={c.id} className="bg-white p-2 rounded-lg border border-stone-100 text-[11px]">
                          <span className="font-bold text-stone-800">{c.author}: </span>
                          <span className="text-stone-600">{c.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text" value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                        placeholder="댓글 남기기..."
                        className="flex-1 px-3 py-1.5 text-[11px] rounded-lg border border-stone-200 focus:outline-none bg-white"
                      />
                      <button onClick={() => handleCommentSubmit(post.id)} className="px-3 bg-stone-800 text-white text-[11px] font-bold rounded-lg">등록</button>
                    </div>
                  </div>
                  
                  {currentUser && currentUser === post.rawAuthor && (
                    <div className="flex justify-end gap-1.5 pt-1 text-[10px]">
                      <button onClick={() => handleEditWalkPost(post)} className="text-stone-500 hover:underline">수정</button>
                      <button onClick={() => handleDeleteWalkPost(post.id, post.rawAuthor)} className="text-rose-500 hover:underline">삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* 하단 플로팅 탭바 */}
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-14 bg-white/90 backdrop-blur-xl border border-white/40 rounded-full flex items-center justify-around z-50 px-3 shadow-[0_12px_32px_rgba(225,29,72,0.18)]">
        <button 
          onClick={() => setMainTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-black transition-all ${
            mainTab === 'map' 
              ? 'bg-rose-600 text-white shadow-md shadow-rose-200' 
              : 'text-stone-400 hover:text-rose-600'
          }`}
        >
          <span className="text-base">🗺️</span>
          <span>댕냥맵</span>
        </button>
        <button 
          onClick={() => setMainTab('walk')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-black transition-all ${
            mainTab === 'walk' 
              ? 'bg-rose-600 text-white shadow-md shadow-rose-200' 
              : 'text-stone-400 hover:text-rose-600'
          }`}
        >
          <span className="text-base">🐾</span>
          <span>동네산책</span>
        </button>
      </nav>

      {/* 회원정보 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-3 border border-rose-100 animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="text-sm font-black text-rose-950">내 정보 수정</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 text-xs">✕</button>
            </div>
            {editError && <div className="text-[10px] text-rose-600 bg-rose-50 p-2 rounded-lg text-center font-bold">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="flex flex-col items-center gap-1.5">
                <img src={editProfileImg} alt="미리보기" className="w-12 h-12 rounded-full object-cover border-2 border-rose-500 shadow-sm" />
                <input id="mo-upload" type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                <label htmlFor="mo-upload" className="text-[10px] text-rose-600 font-bold cursor-pointer">사진 변경</label>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-stone-500">닉네임</label>
                <input type="text" value={editNickname} onChange={(e) => setEditNickname(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-stone-500">성별</label>
                <select value={editGender} onChange={(e) => setEditGender(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 text-stone-700 font-medium">
                  <option value="여성">여성</option><option value="남성">남성</option>
                </select>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-stone-500">강아지 종</label>
                <input type="text" value={editDogBreed} onChange={(e) => setEditDogBreed(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg">취소</button>
                <button type="submit" className="flex-1 py-2 bg-rose-600 text-white text-xs font-black rounded-lg">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppMain />} />
        <Route path="/oauth/kakao/callback" element={<KakaoCallback />} />
      </Routes>
    </Router>
  );
}

export default App;