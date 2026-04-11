// ══════════════════════════════════════════════════════════════
// GROUP-ANALYTICS.JS — グループ分析・AI提案・採用トラッキング
// ══════════════════════════════════════════════════════════════
//
// Phase 2: グループ平均スコア表示、メニュー×スコア紐付け、
//          根拠付きAI提案、採用/却下トラッキング
//
// 依存: sbFep (core.js), GroupContext (group-context.js),
//       FepCalc (fep-calc.js)
// ══════════════════════════════════════════════════════════════

const GroupAnalytics = (() => {
  'use strict';

  // ── 根拠コード定義 ──────────────────────────────────────
  const RATIONALE = {
    vfe_high:       { label: 'VFE過高', text: '難易度が高すぎる可能性があります。選手の混乱が大きい状態です。' },
    vfe_low:        { label: 'VFE過低', text: '課題が簡単すぎます。成長のためにステップアップが可能です。' },
    fprime_negative:{ label: 'F\'低下', text: '選手のモチベーションが低下しています。安全な環境作りが優先です。' },
    fprime_high:    { label: 'F\'良好', text: 'ポジティブな体験ができています。さらに挑戦的な課題に進めます。' },
    info_overload:  { label: '情報過多', text: '情報量が多すぎて混乱しています。チャネルを絞りましょう。' },
    execution_burden:{ label: '負荷過大', text: '実行的負荷が高すぎます。制約を緩めましょう。' },
    high_uncertainty:{ label: '不確実性大', text: '不確実性が高い状態です。反復練習で安定化を図りましょう。' },
    layer_mismatch: { label: 'レイヤー不一致', text: 'メニューのレイヤーがスコアに対して適切ではありません。' },
    coaching_mismatch:{ label: 'コーチング不一致', text: 'コーチングタイプがスコアに合っていません。' },
    balanced:       { label: '適正', text: '現在の設定が適正範囲です。このまま継続しましょう。' },
  };

  // ══════════════════════════════════════════════════════════
  //  データ取得
  // ══════════════════════════════════════════════════════════

  /**
   * グループ平均スコアを取得
   * @returns { current, previous, history[] }
   */
  async function fetchGroupAverages(groupId, sessionDate) {
    if (!sbFep || !groupId) return { current: null, previous: null, history: [] };

    // 全履歴を日付降順で取得（最大20件）
    const { data, error } = await sbFep
      .from('group_session_averages')
      .select('*')
      .eq('group_id', groupId)
      .order('session_date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('GroupAnalytics.fetchGroupAverages:', error);
      return { current: null, previous: null, history: [] };
    }

    const rows = data || [];

    // 当日データを探す
    const current = rows.find(r => r.session_date === sessionDate) || null;

    // 前回データ（当日以外で最新）
    const previous = rows.find(r => r.session_date !== sessionDate) || null;

    return { current, previous, history: rows };
  }

  /**
   * その日のグループ実施メニュー一覧
   */
  async function fetchGroupMenus(groupId, sessionDate) {
    if (!sbFep || !groupId) return [];

    const { data, error } = await sbFep
      .from('session_menus')
      .select('*')
      .eq('group_id', groupId)
      .eq('session_date', sessionDate)
      .order('id');

    if (error) {
      console.error('GroupAnalytics.fetchGroupMenus:', error);
      return [];
    }
    return data || [];
  }

  /**
   * メニュー別のVFE平均を算出（クライアント側結合）
   */
  async function fetchPerMenuAverages(groupId, sessionDate) {
    if (!sbFep || !groupId) return {};

    // 1. その日の全セッション取得
    const { data: sessions, error: e1 } = await sbFep
      .from('sessions')
      .select('id, score_vfe, score_efe, score_eu, score_f_prime')
      .eq('group_id', groupId)
      .eq('session_date', sessionDate)
      .eq('status', 'completed');

    if (e1 || !sessions) return {};

    // 2. その日の全メニュー取得
    const { data: menus, error: e2 } = await sbFep
      .from('session_menus')
      .select('session_id, menu_name, layer, coaching_type')
      .eq('group_id', groupId)
      .eq('session_date', sessionDate);

    if (e2 || !menus) return {};

    // 3. session_id → スコアのマップ
    const sessionMap = {};
    sessions.forEach(s => { sessionMap[s.id] = s; });

    // 4. メニュー名ごとに集計
    const menuAgg = {};
    menus.forEach(m => {
      const s = sessionMap[m.session_id];
      if (!s) return;
      const key = m.menu_name;
      if (!menuAgg[key]) {
        menuAgg[key] = { menu_name: key, layer: m.layer, coaching_type: m.coaching_type, vfe_values: [], count: 0 };
      }
      if (s.score_vfe != null) {
        menuAgg[key].vfe_values.push(parseFloat(s.score_vfe));
        menuAgg[key].count++;
      }
    });

    // 5. 平均算出
    const result = {};
    Object.keys(menuAgg).forEach(key => {
      const agg = menuAgg[key];
      const vals = agg.vfe_values;
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      result[key] = {
        menu_name: key,
        layer: agg.layer,
        coaching_type: agg.coaching_type,
        avg_vfe: avg != null ? Math.round(avg * 10) / 10 : null,
        count: agg.count,
      };
    });

    return result;
  }

  // ══════════════════════════════════════════════════════════
  //  AI提案生成（根拠付き）
  // ══════════════════════════════════════════════════════════

  /**
   * グループ平均ベースの提案を生成
   * @param {Object} avg - current averages from group_session_averages
   * @param {Array} menus - session_menus for the day
   * @returns {Array} recommendations with type, content, rationale, rationale_code, suggested_*
   */
  function generateGroupRecommendations(avg, menus) {
    if (!avg) return [];

    const vfe = parseFloat(avg.avg_vfe) || 50;
    const fp = parseFloat(avg.avg_f_prime) || 0;
    const efe = parseFloat(avg.avg_efe) || 50;
    const eu = parseFloat(avg.avg_eu) || 50;

    const recs = [];

    // ── レイヤー提案 ──
    const layerRec = _generateLayerRec(vfe, fp, menus);
    recs.push(layerRec);

    // ── コーチングタイプ提案 ──
    const coachRec = _generateCoachingRec(vfe, fp, efe);
    recs.push(coachRec);

    // ── 目的提案 ──
    const purposeRec = _generatePurposeRec(vfe, fp, eu);
    recs.push(purposeRec);

    // コンテキスト情報を全提案に付与
    recs.forEach(r => {
      r.context_avg_vfe = vfe;
      r.context_avg_efe = efe;
      r.context_avg_eu = eu;
      r.context_avg_fprime = fp;
      r.context_record_count = parseInt(avg.record_count) || 0;
    });

    return recs;
  }

  function _generateLayerRec(vfe, fp, menus) {
    // 現在のメニューレイヤーを確認
    const currentLayers = menus.map(m => m.layer).filter(Boolean);
    const hasHighLayer = currentLayers.some(l => l === 'L3' || l === 'L4');
    const hasLowLayer = currentLayers.some(l => l === 'L1' || l === 'L2');

    let content, rationale_code, suggested_layer;

    if (vfe < 30 && fp <= 0.5) {
      content = 'レイヤーを上げましょう（例：L1→L2）。安定しているので、より複雑な課題に挑戦できます。';
      rationale_code = 'vfe_low';
      suggested_layer = hasLowLayer ? 'L2' : 'L3';
    } else if (vfe > 65 || fp > 1.0) {
      content = 'レイヤーを下げましょう（例：L3→L2）。混乱が大きいため、基本に戻って安定させましょう。';
      rationale_code = 'vfe_high';
      suggested_layer = hasHighLayer ? 'L2' : 'L1';
      if (hasHighLayer && vfe > 65) rationale_code = 'layer_mismatch';
    } else {
      content = '現在のレイヤーを維持しましょう。適正な範囲で学習が進んでいます。';
      rationale_code = 'balanced';
      suggested_layer = currentLayers[0] || 'L2';
    }

    return {
      rec_type: 'layer',
      content,
      rationale: RATIONALE[rationale_code].text,
      rationale_code,
      suggested_layer,
      suggested_coaching_type: null,
      suggested_purpose: null,
    };
  }

  function _generateCoachingRec(vfe, fp, efe) {
    let content, rationale_code, suggested_coaching_type;

    if (fp < -0.5 || vfe > 65) {
      content = '安全重視のコーチングを推奨します。安心できる環境で自信を回復しましょう。';
      rationale_code = fp < -0.5 ? 'fprime_negative' : 'vfe_high';
      suggested_coaching_type = 'safe';
    } else if (vfe < 30 && fp > 0.3) {
      content = 'チャレンジ型のコーチングが効果的です。高い基準で成長を促しましょう。';
      rationale_code = 'fprime_high';
      suggested_coaching_type = 'challenge';
    } else if (fp > 0 && vfe >= 30 && vfe <= 50) {
      content = '探索促進型のコーチングを推奨します。新しいアプローチを試す余地があります。';
      rationale_code = 'balanced';
      suggested_coaching_type = 'explore';
    } else {
      content = 'ポジティブなコーチングを継続しましょう。成功体験を積み重ねていきます。';
      rationale_code = efe > 60 ? 'info_overload' : 'balanced';
      suggested_coaching_type = 'positive';
    }

    return {
      rec_type: 'coaching',
      content,
      rationale: RATIONALE[rationale_code].text,
      rationale_code,
      suggested_layer: null,
      suggested_coaching_type,
      suggested_purpose: null,
    };
  }

  function _generatePurposeRec(vfe, fp, eu) {
    let content, rationale_code, suggested_purpose;

    if (vfe < 25) {
      content = '強化・統合を推奨します。安定した状態を活かして、スキルの定着と応用を目指しましょう。';
      rationale_code = 'vfe_low';
      suggested_purpose = ['強化', '統合'];
    } else if (vfe < 45) {
      content = '安定化・強化を推奨します。適正ゾーンで反復練習の効果が最大化されます。';
      rationale_code = 'balanced';
      suggested_purpose = ['安定化', '強化'];
    } else if (vfe < 65) {
      content = '探索・修正を推奨します。不確実性を活かして新しいパターンを見つけましょう。';
      rationale_code = eu > 60 ? 'high_uncertainty' : 'balanced';
      suggested_purpose = ['探索', '修正'];
    } else {
      content = '安定化を最優先にしましょう。基本動作に戻り、予測と結果のずれを最小化します。';
      rationale_code = 'vfe_high';
      suggested_purpose = ['安定化'];
    }

    return {
      rec_type: 'purpose',
      content,
      rationale: RATIONALE[rationale_code].text,
      rationale_code,
      suggested_layer: null,
      suggested_coaching_type: null,
      suggested_purpose,
    };
  }

  // ══════════════════════════════════════════════════════════
  //  提案の永続化・採用トラッキング
  // ══════════════════════════════════════════════════════════

  /**
   * 提案をDBに保存
   * @param {Array} recs - generateGroupRecommendations の戻り値
   * @param {string} groupId
   * @param {string} sessionDate
   * @returns {Array} 保存されたレコード (id付き)
   */
  async function saveRecommendations(recs, groupId, sessionDate) {
    if (!sbFep || !recs.length) return [];

    const userId = typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : null;

    const rows = recs.map(r => ({
      group_id: groupId,
      session_date: sessionDate,
      created_by: userId,
      rec_type: r.rec_type,
      content: r.content,
      rationale: r.rationale,
      rationale_code: r.rationale_code,
      context_avg_vfe: r.context_avg_vfe,
      context_avg_efe: r.context_avg_efe,
      context_avg_eu: r.context_avg_eu,
      context_avg_fprime: r.context_avg_fprime,
      context_record_count: r.context_record_count,
      suggested_layer: r.suggested_layer,
      suggested_coaching_type: r.suggested_coaching_type,
      suggested_purpose: r.suggested_purpose,
      status: 'pending',
    }));

    const { data, error } = await sbFep
      .from('recommendations')
      .upsert(rows, { onConflict: 'group_id,session_date,rec_type', ignoreDuplicates: false })
      .select();

    if (error) {
      console.error('GroupAnalytics.saveRecommendations:', error);
      // upsert にユニーク制約がない場合は insert にフォールバック
      const { data: d2, error: e2 } = await sbFep
        .from('recommendations')
        .insert(rows)
        .select();
      if (e2) console.error('GroupAnalytics.saveRecommendations fallback:', e2);
      return d2 || [];
    }
    return data || [];
  }

  /**
   * 提案のステータスを更新
   */
  async function updateRecommendationStatus(recId, status) {
    if (!sbFep || !recId) return false;

    const userId = typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : null;

    const { error } = await sbFep
      .from('recommendations')
      .update({
        status,
        decided_at: new Date().toISOString(),
        decided_by: userId,
      })
      .eq('id', recId);

    if (error) {
      console.error('GroupAnalytics.updateRecommendationStatus:', error);
      return false;
    }
    return true;
  }

  /**
   * 最新の採用済み提案からプリセット値を返す
   */
  async function fetchAcceptedPresets(groupId) {
    if (!sbFep || !groupId) return null;

    const { data, error } = await sbFep
      .from('recommendations')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'accepted')
      .order('session_date', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return null;

    // 最新セッション日の提案をまとめる
    const latestDate = data[0].session_date;
    const latestRecs = data.filter(r => r.session_date === latestDate);

    const presets = { layer: null, coachingType: null, purpose: [] };
    latestRecs.forEach(r => {
      if (r.rec_type === 'layer' && r.suggested_layer) {
        presets.layer = r.suggested_layer;
      }
      if (r.rec_type === 'coaching' && r.suggested_coaching_type) {
        presets.coachingType = r.suggested_coaching_type;
      }
      if (r.rec_type === 'purpose' && r.suggested_purpose) {
        presets.purpose = r.suggested_purpose;
      }
    });

    presets.fromDate = latestDate;
    return presets;
  }

  /**
   * 前回の採用済み提案に今回の結果を紐付ける
   */
  async function linkOutcome(groupId, sessionDate) {
    if (!sbFep || !groupId) return;

    // 今回のグループ平均を取得
    const { current } = await fetchGroupAverages(groupId, sessionDate);
    if (!current) return;

    // 前回の採用済み提案を探す
    const { data: prevRecs, error } = await sbFep
      .from('recommendations')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'accepted')
      .is('next_session_date', null)
      .lt('session_date', sessionDate)
      .order('session_date', { ascending: false })
      .limit(10);

    if (error || !prevRecs || prevRecs.length === 0) return;

    // 最新の採用済み提案を更新
    const latestDate = prevRecs[0].session_date;
    const toUpdate = prevRecs.filter(r => r.session_date === latestDate);

    for (const rec of toUpdate) {
      const deltaVfe = current.avg_vfe != null && rec.context_avg_vfe != null
        ? parseFloat(current.avg_vfe) - parseFloat(rec.context_avg_vfe)
        : null;

      await sbFep
        .from('recommendations')
        .update({
          next_session_date: sessionDate,
          next_avg_vfe: current.avg_vfe,
          next_avg_fprime: current.avg_f_prime,
          outcome_delta_vfe: deltaVfe != null ? Math.round(deltaVfe * 10) / 10 : null,
        })
        .eq('id', rec.id);
    }
  }

  /**
   * グループの提案履歴を取得
   */
  async function fetchRecommendationHistory(groupId, limit) {
    if (!sbFep || !groupId) return [];
    limit = limit || 30;

    const { data, error } = await sbFep
      .from('recommendations')
      .select('*')
      .eq('group_id', groupId)
      .order('session_date', { ascending: false })
      .order('rec_type')
      .limit(limit);

    if (error) {
      console.error('GroupAnalytics.fetchRecommendationHistory:', error);
      return [];
    }
    return data || [];
  }

  // ══════════════════════════════════════════════════════════
  //  ユーティリティ
  // ══════════════════════════════════════════════════════════

  /**
   * デルタ表示用テキスト生成
   * VFEの場合: 下がった方が良い（down=good）
   */
  function formatDelta(current, previous, invertGood) {
    if (current == null || previous == null) return { text: '--', cls: 'sf-delta-same' };
    const delta = parseFloat(current) - parseFloat(previous);
    if (Math.abs(delta) < 0.1) return { text: '→ 変化なし', cls: 'sf-delta-same' };

    const sign = delta > 0 ? '+' : '';
    const text = `${sign}${delta.toFixed(1)}`;
    // invertGood: VFE/EFE では下がるのが良い
    const isGood = invertGood ? delta < 0 : delta > 0;
    const cls = isGood ? 'sf-delta-down' : 'sf-delta-up';
    const arrow = delta > 0 ? '↑' : '↓';

    return { text: `${arrow} ${text}`, cls };
  }

  /**
   * 根拠コードからラベルを取得
   */
  function getRationaleLabel(code) {
    return RATIONALE[code] ? RATIONALE[code].label : code;
  }

  // ── Public API ──
  return {
    fetchGroupAverages,
    fetchGroupMenus,
    fetchPerMenuAverages,
    generateGroupRecommendations,
    saveRecommendations,
    updateRecommendationStatus,
    fetchAcceptedPresets,
    linkOutcome,
    fetchRecommendationHistory,
    formatDelta,
    getRationaleLabel,
    RATIONALE,
  };
})();
