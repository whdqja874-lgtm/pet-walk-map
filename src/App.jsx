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

// 두 지점 간의 거리(km) 계산 함수 (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // 지구 반지름 (km)
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

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return localStorage.getItem('pet_map_user') || '';
    } catch (e) {
      return '';
    }
  });

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('pet_map_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // 현재 사용자 위치(GPS) 상태 관리 (10km 반경 필터용)
  const [userLocation, setUserLocation] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editGender, setEditGender] = useState('여성');
  const [editDogBreed, setEditDogBreed] = useState('');
  const [editProfileImg, setEditProfileImg] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('pet_map_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
    const savedProfile = localStorage.getItem('pet_map_user_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }

    // 앱 실행 시 사용자 현재 위치 가져오기 시도
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
  const [newPostType, setNewPostType] = useState('동네산책 같이해요'); // 산책 유형 선택 state
  const [walkFilterType, setWalkFilterType] = useState('all'); // 키워드 필터 (all, 동네산책 같이해요, 산책 대행)
  const [walkScopeFilter, setWalkScopeFilter] = useState('all'); // 범위 필터 (all, local)

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
      reader.onloadend = () => {
        setEditProfileImg(reader.result);
      };
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
        const options = {
          center: centerPosition,
          level: 4 
        };
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
            }, {
              bounds: currentBounds,
              location: currentCenter
            });
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

    const isPurePetFacility = place.category_name.includes('동물') || 
                              place.category_name.includes('애견') || 
                              place.category_name.includes('반려');

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
    overlayContent.onclick = function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
    };

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
    
    closeBtn.addEventListener('click', function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
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

    detailBtn.addEventListener('click', function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
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

    markerContent.onclick = function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      
      if (currentOverlayRef.current) {
        currentOverlayRef.current.setMap(null); 
        currentOverlayRef.current = null;
      }

      const nextPlaceData = {
        id: place.id,
        place_name: place.place_name,
        address_name: place.address_name,
        phone: place.phone || '',
        place_url: place.place_url,
        tagText: tagText,
        isPurePetFacility,
        reviews: reviewsStorageRef.current[place.id] || []
      };

      const isSidebarOpen = document.querySelector('.pet-sidebar') !== null;

      if (isSidebarOpen) {
        setSelectedPlace(nextPlaceData);
      }

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

        if (gpsMarkerRef.current) {
          gpsMarkerRef.current.setMap(null);
        }

        const gpsContent = document.createElement('div');
        gpsContent.className = 'pet-gps-marker';
        gpsContent.innerHTML = `
          <div class="gps-pulse"></div>
          <div class="gps-dot"></div>
        `;

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
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
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

    setSelectedPlace(prev => {
      if (!prev) return null;
      return {
        ...prev,
        reviews: updatedReviews
      };
    });
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

    // 작성 시점의 위치 정보 가져오기 (없으면 기본값 혹은 null)
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
      postType: newPostType, // '동네산책 같이해요' 또는 '산책 대행'
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
      if (editingPostId === postId) {
        handleCancelEdit();
      }
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
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
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

  // 산책 피드 필터링 로직 (키워드 + 10km 반경 동네 글 필터)
  const filteredWalkPosts = walkPosts.filter(post => {
    // 1. 유형 키워드 필터
    if (walkFilterType !== 'all' && post.postType !== walkFilterType) {
      return false;
    }
    // 2. 동네 글(10km 이내) 필터
    if (walkScopeFilter === 'local') {
      if (!userLocation) {
        return false;
      }
      const distance = calculateDistance(userLocation.lat, userLocation.lng, post.lat || userLocation.lat, post.lng || userLocation.lng);
      if (distance > 10) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fff9fa] overflow-hidden relative font-sans antialiased text-stone-800">
      
      <header className="h-16 bg-white/85 backdrop-blur-md border-b border-rose-100/60 flex items-center justify-between px-6 z-40 shrink-0 shadow-xs">
        
        <div className="flex items-center bg-rose-50/80 p-1 rounded-2xl border border-rose-100/60">
          <button
            onClick={() => setMainTab('map')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2 ${
              mainTab === 'map' 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-200 scale-105' 
                : 'text-stone-500 hover:text-rose-600 hover:bg-rose-100/40'
            }`}
          >
            <span className="text-sm">🗺️</span>
            <span>댕냥맵</span>
          </button>
          
          <button
            onClick={() => setMainTab('walk')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex items-center gap-2 ${
              mainTab === 'walk' 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-200 scale-105' 
                : 'text-stone-500 hover:text-rose-600 hover:bg-rose-100/40'
            }`}
          >
            <span className="text-sm">🐾</span>
            <span>동네산책</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-rose-100 shadow-xs">
              <div className="flex items-center gap-2">
                <img 
                  src={userProfile?.profileImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150'} 
                  alt="프로필" 
                  className="w-7 h-7 rounded-full object-cover border border-rose-200"
                />
                <span className="text-xs font-bold text-rose-950">
                  <b>{currentUser}</b>님
                </span>
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
                <button
                  onClick={openEditModal}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  정보수정
                </button>
                <button
                  onClick={handleLogout}
                  className="text-[11px] font-bold text-stone-400 hover:text-rose-600 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleKakaoLogin}
              className="flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] font-extrabold text-xs py-2.5 px-4 rounded-2xl shadow-md hover:bg-[#fdd835] transition-all cursor-pointer"
            >
              <span>💬</span> 카카오로 3초 만에 시작하기
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex relative w-full h-full overflow-hidden">
        
        <div className={`absolute inset-0 flex flex-row w-full h-full transition-opacity duration-200 ${mainTab === 'map' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          
          <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 30, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={handleMoveToCurrentLocation}
              style={{ 
                backgroundColor: '#ffffff', 
                color: '#e11d48', 
                fontWeight: '700', 
                padding: '10px 16px', 
                borderRadius: '16px', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                border: '1px solid #fecdd3', 
                display: 'flex', 
                flexDirection: 'row',
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer', 
                flexShrink: 0, 
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round"/>
              </svg>
              <span>내 위치</span>
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflowX: 'auto', gap: '8px', paddingBottom: '2px', alignItems: 'center' }}>
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  className={`pet-filter-chip ${activeFilter === option.id ? 'active' : ''}`}
                  onClick={() => setActiveFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {selectedPlace && (
            <div className="pet-sidebar shadow-2xl flex flex-col animate-slide-in">
              <button className="pet-sidebar-close" onClick={() => setSelectedPlace(null)}>✕</button>
              
              <div className="pt-12 pb-5 px-6 flex flex-col items-center text-center relative w-full">
                <h2 className="text-2xl font-black text-rose-950 tracking-tight leading-tight mb-2.5 max-w-[85%]">{selectedPlace.place_name}</h2>
                <span className={`pet-map-tag ${selectedPlace.isPurePetFacility ? 'facility' : 'friendly'}`}>
                  {selectedPlace.tagText}
                </span>
              </div>

              <div className="pet-modern-tab-box">
                <button 
                  className={`pet-modern-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  <span>✨ 플레이스</span>
                </button>
                <button 
                  className={`pet-modern-tab-btn ${activeTab === 'review' ? 'active' : ''}`}
                  onClick={() => setActiveTab('review')}
                >
                  <span>💬 집사토크 ({selectedPlace.reviews ? selectedPlace.reviews.length : 0})</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-2">
                {activeTab === 'info' ? (
                  <div className="space-y-4 py-2 animate-fade-in">
                    <div className="pet-magazine-card">
                      <div className="card-badge pink">PLACE</div>
                      <span className="card-label">도로명 주소</span>
                      <p className="card-value text-stone-800">{selectedPlace.address_name}</p>
                    </div>
                    
                    {selectedPlace.phone && (
                      <div className="pet-magazine-card">
                        <div className="card-badge gray">CALL</div>
                        <span className="card-label">연락처</span>
                        <p className="card-value text-rose-600 font-extrabold tracking-wider">{selectedPlace.phone}</p>
                      </div>
                    )}
                    
                    <div className="pt-6">
                      <a href={selectedPlace.place_url} target="_blank" rel="noreferrer" className="pet-magazine-link-btn">
                        카카오맵에서 더 자세히 보기 🗺️
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full justify-between pb-4 animate-fade-in">
                    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-360px)] pr-1 pet-talk-feed">
                      {!selectedPlace.reviews || selectedPlace.reviews.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <span className="text-4xl block mb-3 opacity-80">💬</span>
                          <p className="text-stone-700 text-xs font-bold mb-1">아직 등록된 토크가 없어요.</p>
                          <p className="text-stone-400 text-[11px]">첫 번째 집사가 되어 소중한 후기를 남겨주세요! ✨</p>
                        </div>
                      ) : (
                        selectedPlace.reviews.map(r => (
                          <div key={r.id} className="pet-talk-bubble-container">
                            <div className="bubble-user-row">
                              <img 
                                src={r.userImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150'} 
                                alt="프로필" 
                                className="w-5 h-5 rounded-full object-cover border border-rose-200"
                              />
                              <span className="user-name">{r.user}</span>
                              <span className="user-time">{r.time || '방금 전'}</span>
                            </div>
                            <div className="pet-talk-bubble">
                              <p>{r.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="pt-2 sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pb-3 pt-6">
                      <div className="pet-talk-input-wrapper">
                        <div className="pet-message-row">
                          <input 
                            type="text" 
                            value={reviewInput}
                            onChange={(e) => setReviewInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleReviewSubmit()}
                            className="pet-message-input"
                            placeholder={currentUser ? "우리 댕댕이/냥이와 다녀온 솔직 후기 ✨" : "로그인 후 이용 가능합니다 🔒"} 
                          />
                          <button 
                            onClick={handleReviewSubmit}
                            className="pet-submit-btn"
                          >
                            <span>남기기</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

          <main className="flex-1 relative h-full">
            <div ref={mapContainer} className="w-full h-full" />
          </main>
        </div>

        <div className={`absolute inset-0 bg-[#fff5f6]/60 overflow-y-auto p-4 md:p-10 transition-opacity duration-200 ${mainTab === 'walk' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="max-w-2xl mx-auto space-y-6">
            
            <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-pink-500 text-white p-7 rounded-[2rem] shadow-xl shadow-rose-500/10 flex items-center justify-between relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="relative z-10 space-y-1.5">
                <span className="inline-block bg-white/25 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-rose-100 mb-1">우리 동네 산책 크루 🐾</span>
                <h2 className="text-2xl font-black tracking-tight">동네 산책 메이트 찾기</h2>
                <p className="text-xs text-rose-100/90 font-medium">반려견과 함께 가볍게 수다 떨며 산책할 이웃을 만나보세요!</p>
              </div>
              <div className="text-5xl relative z-10 bg-white/10 p-3 rounded-2xl backdrop-blur-md">🐕‍🦺</div>
            </div>

            {/* 글 작성 폼 */}
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] shadow-lg shadow-rose-900/5 border border-rose-100/80">
              <h3 className="text-sm font-black text-rose-950 mb-3.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-xs">✍️</span>
                <span>{editingPostId ? '산책 메이트 모집글 수정하기' : '새 산책 메이트 모집하기'}</span>
              </h3>
              {currentUser ? (
                <form onSubmit={handleCreateWalkPost} className="space-y-3.5">
                  {/* 산책 유형 선택 버튼 (라벨 제거) */}
                  <div className="flex items-center gap-2 pb-1">
                    <button
                      type="button"
                      onClick={() => setNewPostType('동네산책 같이해요')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        newPostType === '동네산책 같이해요'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      🐾 동네산책 같이해요
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPostType('산책 대행')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        newPostType === '산책 대행'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      🚶‍♂️ 산책 대행
                    </button>
                  </div>

                  <input
                    type="text"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="제목 (예: 오늘 저녁 8시 화성시청 앞 산책 가실 분!)"
                    className="w-full px-4.5 py-3 text-xs rounded-2xl border border-stone-200/80 focus:outline-none focus:border-rose-500 bg-stone-50/50 font-medium transition-colors"
                  />
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="만나는 장소, 시간, 반려견의 성향 등을 자유롭게 적어주세요 ✨"
                    rows="3"
                    className="w-full px-4.5 py-3 text-xs rounded-2xl border border-stone-200/80 focus:outline-none focus:border-rose-500 bg-stone-50/50 resize-none font-medium transition-colors"
                  ></textarea>
                  <div className="flex justify-end gap-2 pt-1">
                    {editingPostId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs rounded-xl transition-all"
                      >
                        취소
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all hover:scale-105"
                    >
                      {editingPostId ? '수정 완료 ✨' : '모집글 등록 ✨'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-8 text-center bg-stone-50/80 rounded-2xl border border-dashed border-stone-200">
                  <p className="text-xs text-stone-600 font-bold mb-1">🔒 카카오 로그인 후 글을 작성할 수 있습니다.</p>
                  <p className="text-[11px] text-stone-400">상단 우측의 카카오 버튼을 눌러 간편하게 로그인해 보세요!</p>
                </div>
              )}
            </div>

            {/* 필터 바 (유형, 범위 라벨 제거) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setWalkFilterType('all')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                    walkFilterType === 'all' ? 'bg-rose-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  전체 유형
                </button>
                <button
                  onClick={() => setWalkFilterType('동네산책 같이해요')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                    walkFilterType === '동네산책 같이해요' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  🐾 같이해요
                </button>
                <button
                  onClick={() => setWalkFilterType('산책 대행')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                    walkFilterType === '산책 대행' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  🚶‍♂️ 산책 대행
                </button>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                <button
                  onClick={() => setWalkScopeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    walkScopeFilter === 'all' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  🌍 전체글 보기
                </button>
                <button
                  onClick={() => setWalkScopeFilter('local')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    walkScopeFilter === 'local' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  🏠 동네 글만 보기 (10km 내)
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-stone-700">📋 실시간 산책 피드</h3>
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">총 {filteredWalkPosts.length}개의 모임</span>
              </div>

              {filteredWalkPosts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border border-rose-100 shadow-sm">
                  <span className="text-3xl block mb-2">🐾</span>
                  <p className="text-xs text-stone-500 font-bold">조건에 맞는 산책 글이 없습니다.</p>
                </div>
              ) : (
                filteredWalkPosts.map(post => (
                  <div key={post.id} className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-rose-100/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={post.authorImg || userProfile?.profileImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150'} 
                          alt="작성자 프로필" 
                          className="w-10 h-10 rounded-full object-cover border border-rose-200 shadow-sm shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-stone-900">{post.author}</span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                              {post.authorGender || '여성'}
                            </span>
                          </div>
                          {/* 작성 시간 옆에 자기 위치(동네) 표시 */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-stone-400">{formatRelativeTime(post.timestamp)}</span>
                            <span className="text-[10px] text-stone-300">•</span>
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded">
                              📍 내 동네 기준
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* 글에 산책 유형 표현 */}
                        <span className="text-[10px] font-black bg-rose-600 text-white px-3 py-1 rounded-full shadow-2xs">
                          {post.postType || '동네산책 같이해요'} 🐾
                        </span>
                        {currentUser && currentUser === post.rawAuthor && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditWalkPost(post)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-600 rounded-lg font-bold text-[10px] transition-colors"
                              title="모집글 수정"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteWalkPost(post.id, post.rawAuthor)}
                              className="w-6 h-6 bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 rounded-full flex items-center justify-center font-bold text-xs transition-colors"
                              title="모집글 삭제"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-sm font-black text-stone-900 tracking-tight">{post.title}</h4>
                      <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>

                    <div className="bg-[#fff9fa] p-4 rounded-2xl space-y-3 border border-rose-100/60">
                      <span className="text-[11px] font-black text-rose-950 block">💬 함께하기 댓글 ({post.comments.length})</span>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {post.comments.map(c => (
                          <div key={c.id} className="bg-white p-3 rounded-xl border border-stone-200/60 text-xs shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={c.authorImg || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150'} 
                                  alt="댓글 작성자" 
                                  className="w-5 h-5 rounded-full object-cover border border-rose-200 shrink-0"
                                />
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-rose-950">{c.author}</span>
                                  <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-100">
                                    {c.authorGender || '여성'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-stone-400">{formatRelativeTime(c.timestamp)}</span>
                            </div>
                            <p className="text-stone-700 leading-normal pl-7">{c.text}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          placeholder={currentUser ? "댓글을 남겨 산책에 참여해보세요..." : "카카오 로그인 후 댓글 작성 가능 🔒"}
                          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-200/80 bg-white focus:outline-none focus:border-rose-500 font-medium"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs rounded-xl transition-colors shrink-0 shadow-sm"
                        >
                          등록
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-7 max-w-sm w-full shadow-2xl border border-rose-100 flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <h3 className="text-lg font-black text-rose-950">✨ 내 정보 수정하기</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-[11px] p-2.5 rounded-xl text-center font-bold">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="flex flex-col items-center gap-2 pb-1">
                <div className="relative group cursor-pointer">
                  <img 
                    src={editProfileImg} 
                    alt="프로필 미리보기" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 shadow-md"
                  />
                  <label htmlFor="edit-profile-upload" className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    변경
                  </label>
                </div>
                <input 
                  id="edit-profile-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleEditImageChange} 
                  className="hidden" 
                />
                <label htmlFor="edit-profile-upload" className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer">
                  프로필 사진 변경하기 📷
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-stone-700">닉네임</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => { setEditNickname(e.target.value); setEditError(''); }}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-500 bg-stone-50 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-stone-700">성별</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
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
                  value={editDogBreed}
                  onChange={(e) => { setEditDogBreed(e.target.value); setEditError(''); }}
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-500 bg-stone-50 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs rounded-xl transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all"
                >
                  저장하기 🐾
                </button>
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