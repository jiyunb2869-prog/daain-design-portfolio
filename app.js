(() => {
  'use strict';

  // ===== State =====
  let projects = [];
  let proposals = [];
  let currentCategory = 'all';
  let currentDesignType = 'all';
  let currentFacadeCategory = '';
  let currentLayoutCategory = '';
  let currentSearch = '';
  let currentYear = '';
  let sliderIndex = 0;
  let currentProject = null;
  let filteredImages = [];
  // 현상공모
  let currentProposalType = 'all';  // all, 일반공모, 제안공모
  let currentProposalCompany = '';
  let proposalSliderIndex = 0;
  let currentProposal = null;
  let currentEntry = null;
  let filteredPages = [];
  let isProposalMode = false;

  // ===== DOM =====
  const grid = document.getElementById('projectGrid');
  const proposalGrid = document.getElementById('proposalGrid');
  const emptyState = document.getElementById('emptyState');
  const stats = document.getElementById('stats');
  const searchInput = document.getElementById('searchInput');
  const yearFilter = document.getElementById('yearFilter');
  const facadeFilter = document.getElementById('facadeFilter');
  const layoutFilter = document.getElementById('layoutFilter');
  const subFilter = document.getElementById('subFilter');
  const proposalSubFilter = document.getElementById('proposalSubFilter');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const sliderContainer = document.getElementById('sliderContainer');
  const sliderPrev = document.getElementById('sliderPrev');
  const sliderNext = document.getElementById('sliderNext');
  const sliderCaption = document.getElementById('sliderCaption');
  const sliderCounter = document.getElementById('sliderCounter');
  const sliderThumbs = document.getElementById('sliderThumbs');
  const imageFilter = document.getElementById('imageFilter');
  // 현상공모 모달
  const proposalModalOverlay = document.getElementById('proposalModalOverlay');
  const proposalModalClose = document.getElementById('proposalModalClose');
  const proposalSliderContainer = document.getElementById('proposalSliderContainer');
  const proposalSliderPrev = document.getElementById('proposalSliderPrev');
  const proposalSliderNext = document.getElementById('proposalSliderNext');
  const proposalSliderCaption = document.getElementById('proposalSliderCaption');
  const proposalSliderCounter = document.getElementById('proposalSliderCounter');
  const proposalSliderThumbs = document.getElementById('proposalSliderThumbs');
  const proposalPageFilter = document.getElementById('proposalPageFilter');
  const entryTabs = document.getElementById('entryTabs');

  const categoryLabels = {
    completion: '일반 준공작',
    design: '일반 디자인작',
    residential_design: '주거 디자인',
    residential_completion: '주거 준공'
  };

  const placeholderGradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #ffecd2, #fcb69f)',
    'linear-gradient(135deg, #a1c4fd, #c2e9fb)'
  ];

  // ===== Load Data =====
  async function loadProjects() {
    try {
      var res = await fetch('/api/projects');
      if (res.ok) {
        projects = await res.json();
      } else {
        throw new Error('no server');
      }
    } catch {
      if (typeof PROJECT_DATA !== 'undefined' && PROJECT_DATA.length > 0) {
        projects = PROJECT_DATA;
      } else {
        projects = [];
      }
    }
    populateYearFilter();
    populateFacadeFilter();
    populateLayoutFilter();
    renderCards();
    try { buildHero(); } catch(e) { console.error('buildHero error:', e); }
    return projects;
  }

  let proposalsLoaded = false;
  let proposalsLoading = null;

  async function loadProposals() {
    if (proposalsLoaded) return;
    if (proposalsLoading) return proposalsLoading;

    proposalsLoading = (async function() {
      try {
        var res = await fetch('/api/proposals');
        if (res.ok) {
          proposals = await res.json();
          console.log('[Portfolio] Proposals loaded:', proposals.length);
        } else {
          throw new Error('no server');
        }
      } catch(e) {
        console.warn('[Portfolio] Proposals fetch failed:', e);
        if (typeof PROPOSAL_DATA !== 'undefined' && PROPOSAL_DATA.length > 0) {
          proposals = PROPOSAL_DATA;
        } else {
          proposals = [];
        }
      }
      proposalsLoaded = true;
      proposalsLoading = null;
    })();

    return proposalsLoading;
  }

  // ===== Year Filter =====
  function populateYearFilter() {
    const years = [...new Set(projects.map(p => p.year).filter(y => y > 0))].sort((a, b) => b - a);
    yearFilter.innerHTML = '<option value="">연도 전체</option>';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y + '년';
      yearFilter.appendChild(opt);
    });
  }

  // ===== Facade Filter =====
  function populateFacadeFilter() {
    var cats = new Set();
    projects.forEach(function(p) {
      (p.facadeCategories || []).forEach(function(c) { cats.add(c); });
    });
    facadeFilter.innerHTML = '<option value="">입면 카테고리 전체</option>';
    cats.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      facadeFilter.appendChild(opt);
    });
    facadeFilter.style.display = cats.size > 0 ? '' : 'none';
  }

  // ===== Layout Filter =====
  function populateLayoutFilter() {
    var cats = new Set();
    projects.forEach(function(p) {
      (p.layoutCategories || []).forEach(function(c) { cats.add(c); });
    });
    layoutFilter.innerHTML = '<option value="">배치 카테고리 전체</option>';
    cats.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      layoutFilter.appendChild(opt);
    });
    layoutFilter.style.display = cats.size > 0 ? '' : 'none';
  }

  // ===== Filter =====
  function isDesignCategory(cat) {
    return cat === 'design' || cat === 'residential_design';
  }

  function updateSubFilter() {
    if (isDesignCategory(currentCategory)) {
      subFilter.style.display = '';
    } else {
      subFilter.style.display = 'none';
      currentDesignType = 'all';
    }
  }

  async function switchMode(toProposal) {
    isProposalMode = toProposal;
    if (toProposal) {
      grid.style.display = 'none';
      proposalGrid.style.display = '';
      subFilter.style.display = 'none';
      proposalSubFilter.style.display = '';
      facadeFilter.style.display = 'none';
      layoutFilter.style.display = 'none';
      // proposals 로딩 보장
      if (!proposalsLoaded) {
        stats.textContent = '현상도집 데이터 로딩 중...';
        await loadProposals();
      }
      populateProposalCompanyFilter();
      renderProposalCards();
    } else {
      grid.style.display = '';
      proposalGrid.style.display = 'none';
      proposalSubFilter.style.display = 'none';
      updateSubFilter();
      populateFacadeFilter();
      renderCards();
    }
  }

  // 현상공모 유형에 따른 페이지 카테고리 목록
  var PAGE_CATS_GENERAL = [
    '기본구상도', '단지배치도', '단지계획도', '특화계획도',
    '단위세대 평면도', '주거동 평면도', '주거동 입면도',
    '부대복리시설 계획도', '모형사진', '돌출발코니 상세도',
    '조감도', '투시도'
  ];
  var PAGE_CATS_PROPOSAL = [
    '단지계획도', '인동거리검토도', '특화계획도',
    '단위세대 평면도', '주거동 평면도', '조감도', '투시도'
  ];

  function getFiltered() {
    return projects.filter(p => {
      if (currentCategory !== 'all' && p.category !== currentCategory) return false;
      if (currentDesignType !== 'all' && p.designType !== currentDesignType) return false;
      if (currentFacadeCategory && !(p.facadeCategories || []).includes(currentFacadeCategory)) return false;
      if (currentLayoutCategory && !(p.layoutCategories || []).includes(currentLayoutCategory)) return false;
      if (currentYear && p.year !== Number(currentYear)) return false;
      if (currentSearch) {
        const q = currentSearch.toLowerCase();
        const searchable = [p.name, p.client, p.address, p.use].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }

  // ===== Render Cards =====
  function renderCards() {
    const filtered = getFiltered();
    grid.innerHTML = '';
    stats.textContent = '\uCD1D ' + filtered.length + '\uAC1C \uD504\uB85C\uC81D\uD2B8';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    filtered.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');

      const gradient = placeholderGradients[idx % placeholderGradients.length];
      const imgCount = (p.images || []).length;
      const badgeClass = 'card__badge--' + p.category;
      const badgeLabel = categoryLabels[p.category] || p.category;
      const designTypeLabels = { dain: '다인 현상작', other: '타회사 현상작' };
      const designTypeBadge = p.designType
        ? '<span class="card__badge card__badge--' + p.designType + '">' + (designTypeLabels[p.designType] || '') + '</span>'
        : '';
      // 입면 카테고리 배지
      var facadeBadges = '';
      (p.facadeCategories || []).forEach(function(fc) {
        facadeBadges += '<span class="card__badge card__badge--facade">' + fc + '</span>';
      });
      var layoutBadges = '';
      (p.layoutCategories || []).forEach(function(lc) {
        layoutBadges += '<span class="card__badge card__badge--layout">' + lc + '</span>';
      });
      const yearText = p.year > 0 ? p.year + '\uB144' : '';
      const metaParts = [yearText, p.client].filter(Boolean).join(' \u00B7 ');

      var aiOverlay = (facadeBadges || layoutBadges)
        ? '<div class="card__ai-tags">' + facadeBadges + layoutBadges + '</div>'
        : '';

      card.innerHTML =
        '<div class="card__image-wrap">' +
          '<div class="card__image--placeholder" style="background:' + gradient + '">' +
            p.name +
          '</div>' +
          aiOverlay +
        '</div>' +
        '<div class="card__body">' +
          '<div class="card__name">' + p.name + '</div>' +
          '<div class="card__meta">' + metaParts + '</div>' +
          '<div class="card__badges">' +
            '<span class="card__badge ' + badgeClass + '">' + badgeLabel + '</span>' +
            designTypeBadge +
            (imgCount > 0 ? '<span class="card__image-count">' + imgCount + '\uC7A5</span>' : '') +
          '</div>' +
        '</div>';

      if (p.thumbnail) {
        const img = new Image();
        img.onload = function() {
          const placeholder = card.querySelector('.card__image--placeholder');
          if (placeholder) {
            const imgEl = document.createElement('img');
            imgEl.className = 'card__image';
            imgEl.src = p.thumbnail;
            imgEl.alt = p.name;
            imgEl.loading = 'lazy';
            placeholder.replaceWith(imgEl);
          }
        };
        img.src = p.thumbnail;
      }

      card.addEventListener('click', function() { openModal(p); });
      card.addEventListener('keydown', function(e) { if (e.key === 'Enter') openModal(p); });
      grid.appendChild(card);
    });
  }

  // ===== Modal =====
  function openModal(project) {
    currentProject = project;
    sliderIndex = 0;

    document.getElementById('modalName').textContent = project.name;
    document.getElementById('modalConcept').textContent = project.concept || '';
    document.getElementById('infoYear').textContent = project.year > 0 ? project.year + '\uB144' : '';
    document.getElementById('infoClient').textContent = project.client || '';
    document.getElementById('infoUse').textContent = project.use || '';
    document.getElementById('infoAddress').textContent = project.address || '';
    document.getElementById('infoSiteArea').textContent = project.siteArea || '';
    document.getElementById('infoBuildingArea').textContent = project.buildingArea || '';
    document.getElementById('infoTotalArea').textContent = project.totalArea || '';
    document.getElementById('infoFloors').textContent = project.floors || '';
    document.getElementById('infoCoverage').textContent = project.coverageRatio || '';
    document.getElementById('infoFAR').textContent = project.floorAreaRatio || '';

    // 입면 카테고리 표시
    updateFacadeSection(project);

    buildImageFilter(project.images || []);
    filteredImages = project.images || [];
    buildSlider(filteredImages);

    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function updateFacadeSection(project) {
    var badgesEl = document.getElementById('facadeBadges');
    var descEl = document.getElementById('facadeDesc');
    var facadeSection = document.getElementById('facadeSection');
    badgesEl.innerHTML = '';
    descEl.textContent = '';

    var cats = project.facadeCategories || [];
    if (cats.length > 0) {
      facadeSection.style.display = '';
      cats.forEach(function(c) {
        var span = document.createElement('span');
        span.className = 'facade-badge';
        span.textContent = c;
        badgesEl.appendChild(span);
      });
      descEl.textContent = project.facadeDescription || '';
    } else {
      facadeSection.style.display = 'none';
    }

    // 배치 카테고리
    var layoutBadgesEl = document.getElementById('layoutBadges');
    var layoutDescEl = document.getElementById('layoutDesc');
    var layoutSection = document.getElementById('layoutSection');
    layoutBadgesEl.innerHTML = '';
    layoutDescEl.textContent = '';

    var layoutCats = project.layoutCategories || [];
    if (layoutCats.length > 0) {
      layoutSection.style.display = '';
      layoutCats.forEach(function(c) {
        var span = document.createElement('span');
        span.className = 'layout-badge';
        span.textContent = c;
        layoutBadgesEl.appendChild(span);
      });
      layoutDescEl.textContent = project.layoutDescription || '';
    } else {
      layoutSection.style.display = 'none';
    }
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    currentProject = null;
  }

  function buildImageFilter(images) {
    imageFilter.innerHTML = '';
    var subfolders = [];
    var seen = {};
    images.forEach(function(img) {
      var sf = img.subfolder || '';
      if (sf && !seen[sf]) { seen[sf] = true; subfolders.push(sf); }
    });

    if (subfolders.length <= 1) return;

    var allBtn = document.createElement('button');
    allBtn.className = 'image-filter__btn active';
    allBtn.textContent = '\uC804\uCCB4 (' + images.length + ')';
    allBtn.addEventListener('click', function() {
      imageFilter.querySelectorAll('.image-filter__btn').forEach(function(b) { b.classList.remove('active'); });
      allBtn.classList.add('active');
      filteredImages = currentProject.images || [];
      sliderIndex = 0;
      buildSlider(filteredImages);
    });
    imageFilter.appendChild(allBtn);

    subfolders.forEach(function(sf) {
      var count = images.filter(function(img) { return img.subfolder === sf; }).length;
      var btn = document.createElement('button');
      btn.className = 'image-filter__btn';
      var label = sf.replace(/^\d+[\.\s]*/, '').replace(/^#/, '');
      btn.textContent = label + ' (' + count + ')';
      btn.addEventListener('click', function() {
        imageFilter.querySelectorAll('.image-filter__btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filteredImages = (currentProject.images || []).filter(function(img) { return img.subfolder === sf; });
        sliderIndex = 0;
        buildSlider(filteredImages);
      });
      imageFilter.appendChild(btn);
    });
  }

  function buildSlider(images) {
    sliderContainer.innerHTML = '';
    sliderThumbs.innerHTML = '';

    if (!images || images.length === 0) {
      sliderContainer.innerHTML = '<div class="slider__slide slider__slide--placeholder">\uC774\uBBF8\uC9C0 \uC5C6\uC74C</div>';
      sliderCaption.textContent = '';
      sliderCounter.textContent = '';
      return;
    }

    images.forEach(function(img, i) {
      var slide = document.createElement('div');
      slide.className = 'slider__slide';

      var imgEl = document.createElement('img');
      imgEl.src = img.src;
      imgEl.alt = img.caption || img.pageType || '';
      imgEl.loading = i < 3 ? 'eager' : 'lazy';
      imgEl.onerror = function() {
        slide.classList.add('slider__slide--placeholder');
        slide.innerHTML = '<span style="font-size:3rem;opacity:0.3;">&#x1f3d7;</span><span>' + (img.caption || '') + '</span>';
      };
      slide.appendChild(imgEl);
      sliderContainer.appendChild(slide);

      var thumb = document.createElement('img');
      thumb.className = 'slider__thumb' + (i === 0 ? ' active' : '');
      thumb.src = img.src;
      thumb.alt = img.caption || img.pageType || '';
      thumb.loading = 'lazy';
      thumb.addEventListener('click', function() { goToSlide(i); });
      sliderThumbs.appendChild(thumb);
    });

    updateSlider();
  }

  function goToSlide(index) {
    if (filteredImages.length === 0) return;
    sliderIndex = ((index % filteredImages.length) + filteredImages.length) % filteredImages.length;
    updateSlider();
  }

  function updateSlider() {
    sliderContainer.style.transform = 'translateX(-' + (sliderIndex * 100) + '%)';
    var curImg = filteredImages[sliderIndex];
    sliderCaption.textContent = curImg ? (curImg.caption || curImg.pageType || '') : '';
    sliderCounter.textContent = filteredImages.length > 0
      ? (sliderIndex + 1) + ' / ' + filteredImages.length
      : '';

    var thumbs = sliderThumbs.querySelectorAll('.slider__thumb');
    thumbs.forEach(function(t, i) { t.classList.toggle('active', i === sliderIndex); });
    if (thumbs[sliderIndex]) {
      thumbs[sliderIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // ===== AI 입면 분석 =====
  var facadeAnalyzeBtn = document.getElementById('facadeAnalyzeBtn');
  if (facadeAnalyzeBtn) facadeAnalyzeBtn.addEventListener('click', async function() {
    if (!currentProject) return;
    var btn = this;
    var images = currentProject.images || [];
    if (images.length === 0) {
      alert('분석할 이미지가 없습니다.');
      return;
    }

    // 대표 이미지(조감도 또는 첫번째)로 분석
    var targetImage = currentProject.thumbnail || images[0].src;
    btn.textContent = '분석 중...';
    btn.disabled = true;

    try {
      var res = await fetch('/api/analyze-facade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          imageUrl: targetImage
        })
      });
      var data = await res.json();
      if (data.error) {
        if (data.error.includes('API 키')) {
          openAiConfig();
        } else {
          alert('분석 오류: ' + data.error);
        }
      } else {
        currentProject.facadeCategories = data.result.categories;
        currentProject.facadeDescription = data.result.description;
        updateFacadeSection(currentProject);
        populateFacadeFilter();
        renderCards();
      }
    } catch (e) {
      alert('분석 요청 실패: ' + e.message);
    } finally {
      btn.textContent = 'AI 입면 분석';
      btn.disabled = false;
    }
  });

  // ===== AI 설정 모달 =====
  function openAiConfig() {
    document.getElementById('aiConfigOverlay').classList.add('open');
    fetch('/api/ai-config').then(r => r.json()).then(function(data) {
      document.getElementById('aiKeyStatus').textContent = data.has_key
        ? '현재 키: ' + (data.anthropic_api_key_masked || '설정됨')
        : '키가 설정되지 않았습니다';
    });
  }

  document.getElementById('aiConfigClose').addEventListener('click', function() {
    document.getElementById('aiConfigOverlay').classList.remove('open');
  });
  document.getElementById('aiConfigOverlay').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });

  document.getElementById('aiConfigSave').addEventListener('click', async function() {
    var key = document.getElementById('aiApiKeyInput').value.trim();
    if (!key) { alert('API 키를 입력하세요'); return; }
    try {
      await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropic_api_key: key })
      });
      document.getElementById('aiKeyStatus').textContent = '저장되었습니다';
      document.getElementById('aiApiKeyInput').value = '';
      setTimeout(function() {
        document.getElementById('aiConfigOverlay').classList.remove('open');
      }, 1000);
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
  });

  // ===== 현상공모 =====
  function populateProposalCompanyFilter() {
    var companies = [...new Set(proposals.map(p => p.company).filter(Boolean))].sort();
    var sel = document.getElementById('proposalCompanyFilter');
    sel.innerHTML = '<option value="">참여사 전체</option>';
    companies.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  function getFilteredProposals() {
    return proposals.filter(function(p) {
      // 공모 유형 필터
      if (currentProposalType !== 'all' && p.type !== currentProposalType) return false;
      // 참여사 필터
      if (currentProposalCompany && p.company !== currentProposalCompany) return false;
      // 연도 필터
      if (currentYear && p.year !== Number(currentYear)) return false;
      // 검색
      if (currentSearch) {
        var q = currentSearch.toLowerCase();
        var searchable = [p.projectName, p.company, p.pdfFile].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }

  function groupProposalsByProject(proposals) {
    var groups = {};
    proposals.forEach(function(p) {
      var key = p.projectFolder || p.projectName;
      if (!groups[key]) {
        groups[key] = {
          projectName: p.projectName,
          projectFolder: p.projectFolder,
          type: p.type,
          year: p.year,
          entries: []
        };
      }
      groups[key].entries.push(p);
    });
    return Object.values(groups);
  }

  function renderProposalCards() {
    var filtered = getFilteredProposals();
    proposalGrid.innerHTML = '';

    // 프로젝트 단위로 그룹핑
    var groups = groupProposalsByProject(filtered);

    stats.textContent = '\uCD1D ' + groups.length + '\uAC1C \uD504\uB85C\uC81D\uD2B8 / ' + filtered.length + '\uAC1C \uB3C4\uC9D1';

    if (groups.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    groups.forEach(function(group, idx) {
      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('tabindex', '0');
      var gradient = placeholderGradients[idx % placeholderGradients.length];

      // 당선작 대표 이미지
      var winner = group.entries.find(function(e) { return e.rank === '당선'; }) || group.entries[0];
      var typeBadgeClass = group.type === '일반공모' ? 'card__badge--general' : 'card__badge--invited';
      var entriesInfo = group.entries.map(function(e) {
        return (e.company || '미상') + (e.rank ? '(' + e.rank + ')' : '');
      }).join(', ');

      card.innerHTML =
        '<div class="card__image--placeholder" style="background:' + gradient + '">' +
          group.projectName +
        '</div>' +
        '<div class="card__body">' +
          '<div class="card__name">' + group.projectName + '</div>' +
          '<div class="card__meta">' + entriesInfo + '</div>' +
          '<div class="card__badges">' +
            '<span class="card__badge ' + typeBadgeClass + '">' + group.type + '</span>' +
            '<span class="card__image-count">' + group.entries.length + '\uAC1C \uB3C4\uC9D1</span>' +
          '</div>' +
        '</div>';

      if (winner.thumbnail) {
        var img = new Image();
        img.onload = function() {
          var placeholder = card.querySelector('.card__image--placeholder');
          if (placeholder) {
            var imgEl = document.createElement('img');
            imgEl.className = 'card__image';
            imgEl.src = winner.thumbnail;
            imgEl.alt = group.projectName;
            imgEl.loading = 'lazy';
            placeholder.replaceWith(imgEl);
          }
        };
        img.src = winner.thumbnail;
      }

      card.addEventListener('click', function() {
        openProposalModal(group);
      });
      proposalGrid.appendChild(card);
    });
  }

  // ===== 현상공모 모달 =====
  function openProposalModal(group) {
    currentProposal = group;
    proposalSliderIndex = 0;

    // 기본: 첫 번째 도집 (당선작 우선)
    var winner = group.entries.find(function(e) { return e.rank === '당선'; }) || group.entries[0];
    currentEntry = winner;

    // 프로젝트 정보 표시
    document.getElementById('proposalModalName').textContent = group.projectName;
    document.getElementById('proposalProjectName').textContent = group.projectName;

    updateProposalEntryInfo(currentEntry);

    // 도집 선택 탭 (여러 참여사가 있을 때)
    buildEntryTabs(group);

    // 페이지 필터 탭
    buildProposalPageFilter(currentEntry.pages || [], currentEntry.type || group.type);
    filteredPages = currentEntry.pages || [];
    buildProposalSlider(filteredPages);

    proposalModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function updateProposalEntryInfo(entry) {
    document.getElementById('proposalCompany').textContent = entry.company || '-';
    document.getElementById('proposalRank').textContent = entry.rank || '-';
    document.getElementById('proposalType').textContent = entry.type || '-';
    document.getElementById('proposalPageCount').textContent = (entry.pageCount || 0) + '\uD398\uC774\uC9C0';

    // 배지 업데이트
    var typeBadge = document.getElementById('proposalTypeBadge');
    typeBadge.textContent = entry.type || '';
    typeBadge.className = 'proposal-type-badge ' +
      (entry.type === '일반공모' ? 'proposal-type-badge--general' : 'proposal-type-badge--invited');

    var rankBadge = document.getElementById('proposalRankBadge');
    rankBadge.textContent = entry.rank || '';
  }

  function buildEntryTabs(group) {
    entryTabs.innerHTML = '';
    if (group.entries.length <= 1) return;

    group.entries.forEach(function(entry) {
      var btn = document.createElement('button');
      btn.className = 'entry-tab' + (entry === currentEntry ? ' active' : '');
      var label = entry.company || '미상';
      if (entry.rank) label += ' <span class="entry-rank">' + entry.rank + '</span>';
      btn.innerHTML = label;
      btn.addEventListener('click', function() {
        currentEntry = entry;
        entryTabs.querySelectorAll('.entry-tab').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        updateProposalEntryInfo(entry);
        buildProposalPageFilter(entry.pages || [], entry.type || group.type);
        filteredPages = entry.pages || [];
        proposalSliderIndex = 0;
        buildProposalSlider(filteredPages);
      });
      entryTabs.appendChild(btn);
    });
  }

  function closeProposalModal() {
    proposalModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    currentProposal = null;
    currentEntry = null;
  }

  function buildProposalPageFilter(pages, proposalType) {
    proposalPageFilter.innerHTML = '';

    // 공모유형에 따른 카테고리 목록
    var categoriesForType = proposalType === '일반공모' ? PAGE_CATS_GENERAL : PAGE_CATS_PROPOSAL;

    // 실제 존재하는 카테고리만 필터링
    var existingTypes = {};
    pages.forEach(function(pg) {
      var t = pg.pageType || '기타';
      existingTypes[t] = (existingTypes[t] || 0) + 1;
    });

    // 전체 버튼
    var allBtn = document.createElement('button');
    allBtn.className = 'image-filter__btn active';
    allBtn.textContent = '\uC804\uCCB4 (' + pages.length + ')';
    allBtn.addEventListener('click', function() {
      proposalPageFilter.querySelectorAll('.image-filter__btn').forEach(function(b) { b.classList.remove('active'); });
      allBtn.classList.add('active');
      filteredPages = currentEntry.pages || [];
      proposalSliderIndex = 0;
      buildProposalSlider(filteredPages);
    });
    proposalPageFilter.appendChild(allBtn);

    // 카테고리별 버튼 (정의된 순서대로)
    categoriesForType.forEach(function(cat) {
      var count = existingTypes[cat] || 0;
      if (count === 0) return; // 해당 카테고리 페이지가 없으면 생략

      var btn = document.createElement('button');
      btn.className = 'image-filter__btn';
      btn.textContent = cat + ' (' + count + ')';
      btn.addEventListener('click', function() {
        proposalPageFilter.querySelectorAll('.image-filter__btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filteredPages = (currentEntry.pages || []).filter(function(pg) { return pg.pageType === cat; });
        proposalSliderIndex = 0;
        buildProposalSlider(filteredPages);
      });
      proposalPageFilter.appendChild(btn);
    });

    // 정의된 카테고리에 없는 기타 유형도 표시
    Object.keys(existingTypes).forEach(function(t) {
      if (!categoriesForType.includes(t)) {
        var count = existingTypes[t];
        var btn = document.createElement('button');
        btn.className = 'image-filter__btn';
        btn.textContent = t + ' (' + count + ')';
        btn.addEventListener('click', function() {
          proposalPageFilter.querySelectorAll('.image-filter__btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          filteredPages = (currentEntry.pages || []).filter(function(pg) { return pg.pageType === t; });
          proposalSliderIndex = 0;
          buildProposalSlider(filteredPages);
        });
        proposalPageFilter.appendChild(btn);
      }
    });
  }

  function buildProposalSlider(pages) {
    proposalSliderContainer.innerHTML = '';
    proposalSliderThumbs.innerHTML = '';

    if (!pages || pages.length === 0) {
      proposalSliderContainer.innerHTML = '<div class="slider__slide slider__slide--placeholder">\uD398\uC774\uC9C0 \uC5C6\uC74C</div>';
      proposalSliderCaption.textContent = '';
      proposalSliderCounter.textContent = '';
      return;
    }

    pages.forEach(function(pg, i) {
      var slide = document.createElement('div');
      slide.className = 'slider__slide';
      var imgEl = document.createElement('img');
      imgEl.src = pg.src;
      imgEl.alt = pg.pageType || '';
      imgEl.loading = i < 3 ? 'eager' : 'lazy';
      slide.appendChild(imgEl);
      proposalSliderContainer.appendChild(slide);

      var thumb = document.createElement('img');
      thumb.className = 'slider__thumb' + (i === 0 ? ' active' : '');
      thumb.src = pg.src;
      thumb.loading = 'lazy';
      thumb.addEventListener('click', function() { goToProposalSlide(i); });
      proposalSliderThumbs.appendChild(thumb);
    });

    updateProposalSlider();
  }

  function goToProposalSlide(index) {
    if (filteredPages.length === 0) return;
    proposalSliderIndex = ((index % filteredPages.length) + filteredPages.length) % filteredPages.length;
    updateProposalSlider();
  }

  function updateProposalSlider() {
    proposalSliderContainer.style.transform = 'translateX(-' + (proposalSliderIndex * 100) + '%)';
    var curPage = filteredPages[proposalSliderIndex];
    proposalSliderCaption.textContent = curPage ? (curPage.pageType || '') : '';
    proposalSliderCounter.textContent = filteredPages.length > 0
      ? (proposalSliderIndex + 1) + ' / ' + filteredPages.length
      : '';
    var thumbs = proposalSliderThumbs.querySelectorAll('.slider__thumb');
    thumbs.forEach(function(t, i) { t.classList.toggle('active', i === proposalSliderIndex); });
    if (thumbs[proposalSliderIndex]) {
      thumbs[proposalSliderIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // ===== Event Listeners =====
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelector('.tab.active').classList.remove('active');
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      currentDesignType = 'all';
      currentProposalType = 'all';
      // 서브탭 초기화
      document.querySelectorAll('#subFilter .sub-tab').forEach(function(st) { st.classList.remove('active'); });
      var allSubTab = document.querySelector('#subFilter .sub-tab[data-design-type="all"]');
      if (allSubTab) allSubTab.classList.add('active');
      document.querySelectorAll('#proposalTypeTabs .sub-tab').forEach(function(st) { st.classList.remove('active'); });
      var allProposalTab = document.querySelector('#proposalTypeTabs .sub-tab[data-proposal-type="all"]');
      if (allProposalTab) allProposalTab.classList.add('active');

      if (currentCategory === 'proposal') {
        switchMode(true);
      } else {
        switchMode(false);
      }
    });
  });

  // 디자인작 소분류 서브탭
  document.querySelectorAll('#subFilter .sub-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('#subFilter .sub-tab').forEach(function(st) { st.classList.remove('active'); });
      tab.classList.add('active');
      currentDesignType = tab.dataset.designType;
      renderCards();
    });
  });

  // 현상공모 유형 서브탭 (일반공모/제안공모)
  document.querySelectorAll('#proposalTypeTabs .sub-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('#proposalTypeTabs .sub-tab').forEach(function(st) { st.classList.remove('active'); });
      tab.classList.add('active');
      currentProposalType = tab.dataset.proposalType;
      renderProposalCards();
    });
  });

  // 현상공모 참여사 필터
  document.getElementById('proposalCompanyFilter').addEventListener('change', function(e) {
    currentProposalCompany = e.target.value;
    renderProposalCards();
  });

  var searchTimeout;
  searchInput.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      currentSearch = e.target.value;
      if (isProposalMode) {
        renderProposalCards();
      } else {
        renderCards();
      }
    }, 200);
  });

  yearFilter.addEventListener('change', function(e) {
    currentYear = e.target.value;
    if (isProposalMode) {
      renderProposalCards();
    } else {
      renderCards();
    }
  });

  facadeFilter.addEventListener('change', function(e) {
    currentFacadeCategory = e.target.value;
    renderCards();
  });

  layoutFilter.addEventListener('change', function(e) {
    currentLayoutCategory = e.target.value;
    renderCards();
  });

  // 프로젝트 모달 이벤트
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) closeModal();
  });

  // 현상도집 모달 이벤트
  proposalModalClose.addEventListener('click', closeProposalModal);
  proposalModalOverlay.addEventListener('click', function(e) {
    if (e.target === proposalModalOverlay) closeProposalModal();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
      closeProposalModal();
      document.getElementById('aiConfigOverlay').classList.remove('open');
    }
    if (currentProject) {
      if (e.key === 'ArrowLeft') goToSlide(sliderIndex - 1);
      if (e.key === 'ArrowRight') goToSlide(sliderIndex + 1);
    }
    if (currentProposal) {
      if (e.key === 'ArrowLeft') goToProposalSlide(proposalSliderIndex - 1);
      if (e.key === 'ArrowRight') goToProposalSlide(proposalSliderIndex + 1);
    }
  });

  sliderPrev.addEventListener('click', function() { goToSlide(sliderIndex - 1); });
  sliderNext.addEventListener('click', function() { goToSlide(sliderIndex + 1); });
  proposalSliderPrev.addEventListener('click', function() { goToProposalSlide(proposalSliderIndex - 1); });
  proposalSliderNext.addEventListener('click', function() { goToProposalSlide(proposalSliderIndex + 1); });

  // ===== Hero Background =====
  function buildHero() {
    var heroBg = document.getElementById('heroBg');
    var heroProject = document.getElementById('heroProject');
    if (!heroBg) return;

    // 썸네일이 있는 프로젝트만 수집
    var withThumb = projects.filter(function(p) { return p.thumbnail; });
    if (withThumb.length === 0) return;

    // 랜덤 선택
    var featured = withThumb[Math.floor(Math.random() * withThumb.length)];
    heroBg.style.backgroundImage = 'url("' + featured.thumbnail + '")';

    // 우측 하단에 프로젝트명 + 연도
    if (featured && heroProject) {
      var yearStr = featured.year > 0 ? featured.year : '';
      heroProject.innerHTML =
        '<span class="hero__project-year">' + yearStr + '</span>' +
        featured.name;
    }
  }

  // ===== Init =====
  loadProjects();
  loadProposals();
})();
