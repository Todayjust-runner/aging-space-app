export const riskRules = [
  {
    "id": "no_shower_grab_bar",
    "space": "bathroom",
    "name": "淋浴区无支撑扶手",
    "level": "高",
    "riskType": "跌倒",
    "evidence": [
      "湿区",
      "未识别到连续支撑点",
      "老人起身/转身动作频繁"
    ],
    "rule": "湿区活动 + 缺少可握持支撑 + 跌倒后果严重",
    "action": "加装 L 型扶手或竖向扶手，并由人工确认墙体承重条件",
    "recommendedProductIds": [
      "grab_bar_l",
      "shower_chair",
      "layout_review"
    ],
    "requiresReview": true
  },
  {
    "id": "slippery_floor",
    "space": "bathroom",
    "name": "地面湿滑或反光明显",
    "level": "中",
    "riskType": "跌倒",
    "evidence": [
      "湿区地面反光",
      "缺少防滑垫",
      "排水坡度需人工确认"
    ],
    "rule": "湿区地面 + 防滑措施不足 + 老年人步态稳定性下降",
    "action": "补充防滑垫、防滑条或防滑涂层，复扫确认覆盖范围",
    "recommendedProductIds": [
      "anti_slip_mat",
      "anti_slip_coating",
      "anti_slip_strips"
    ],
    "requiresReview": false
  },
  {
    "id": "threshold_height",
    "space": "bathroom",
    "name": "门槛高差可能绊倒",
    "level": "中高",
    "riskType": "绊倒",
    "evidence": [
      "入口高差明显",
      "需参考物或人工补录高度",
      "夜间通行频率较高"
    ],
    "rule": "高差点位 + 出入口动线 + 夜间识别能力下降",
    "action": "采用坡化垫或缓坡处理，高差较大时进入人工复核",
    "recommendedProductIds": [
      "threshold_ramp",
      "anti_slip_strips",
      "layout_review"
    ],
    "requiresReview": true
  },
  {
    "id": "bedside_clearance",
    "space": "bedroom",
    "name": "床边起身通道不足",
    "level": "中高",
    "riskType": "起身障碍",
    "evidence": [
      "床边通道被柜体压缩",
      "轮椅或助行器通过条件不足",
      "老人夜间起身频繁"
    ],
    "rule": "起身点 + 通行空间不足 + 夜间行动能力下降",
    "action": "调整床柜布局，预留连续通道，必要时设置床边扶手",
    "recommendedProductIds": [
      "bed_rail",
      "sofa_assist",
      "vertical_bar",
      "layout_review"
    ],
    "requiresReview": true
  },
  {
    "id": "night_lighting",
    "space": "bedroom",
    "name": "夜间照明覆盖不足",
    "level": "中",
    "riskType": "视觉识别",
    "evidence": [
      "床头到门口存在暗区",
      "开关距离床边较远",
      "未设置感应夜灯"
    ],
    "rule": "夜间动线 + 照明不足 + 老年视觉适应能力下降",
    "action": "补充低眩光感应夜灯，优先覆盖床边、门口和卫生间方向",
    "recommendedProductIds": [
      "motion_night_light",
      "motion_light_bar"
    ],
    "requiresReview": false
  },
  {
    "id": "sharp_corner",
    "space": "bedroom",
    "name": "柜角或桌角磕碰点",
    "level": "低",
    "riskType": "磕碰",
    "evidence": [
      "动线旁存在尖角",
      "边角高度接近髋部或膝部",
      "缺少缓冲保护"
    ],
    "rule": "高频经过点 + 尖锐边角 + 老年反应速度下降",
    "action": "增加圆角防撞条或调整家具位置",
    "recommendedProductIds": [
      "corner_guard"
    ],
    "requiresReview": false
  },
  {
    "id": "corridor_width",
    "space": "corridor",
    "name": "过道有效通行宽度不足",
    "level": "中高",
    "riskType": "通行障碍",
    "evidence": [
      "鞋柜和临时物品占用通道",
      "助行器通过条件不足",
      "转角处余量不足"
    ],
    "rule": "连续通道 + 有效宽度不足 + 辅具通行需求",
    "action": "清理临时堆放物，调整柜体占位，保留连续通行面",
    "recommendedProductIds": [
      "layout_review"
    ],
    "requiresReview": true
  },
  {
    "id": "wire_clutter",
    "space": "corridor",
    "name": "线缆杂物造成绊倒风险",
    "level": "中",
    "riskType": "绊倒",
    "evidence": [
      "地面线缆外露",
      "鞋垫边缘翘起",
      "玄关换鞋动作频繁"
    ],
    "rule": "出入口高频动作 + 地面障碍物 + 下肢抬高能力下降",
    "action": "固定线缆，移除翘边地垫，设置收纳区",
    "recommendedProductIds": [
      "cable_tray",
      "rug_grippers"
    ],
    "requiresReview": false
  },
  {
    "id": "corridor_light",
    "space": "corridor",
    "name": "过道照明存在暗区",
    "level": "中",
    "riskType": "视觉识别",
    "evidence": [
      "转角和玄关处亮度不足",
      "夜间回家或起夜通行频率高",
      "无自动感应灯"
    ],
    "rule": "连续动线 + 暗区 + 老年视觉适应延迟",
    "action": "增设人体感应灯或低位灯带，避免强眩光",
    "recommendedProductIds": [
      "motion_night_light",
      "motion_light_bar"
    ],
    "requiresReview": false
  },
  {
    "id": "kitchen_slippery_floor",
    "space": "kitchen",
    "name": "厨房操作区油水湿滑",
    "level": "中高",
    "riskType": "跌倒",
    "evidence": [
      "水槽和灶台前为高频站立区",
      "地面可能有油水反光",
      "老人转身取物频繁"
    ],
    "rule": "湿滑地面 + 转身动作 + 下肢稳定性下降",
    "action": "补充防滑垫或局部防滑处理，并保持水槽、灶台前连续防滑面",
    "recommendedProductIds": [
      "kitchen_mat",
      "anti_slip_coating"
    ],
    "requiresReview": false
  },
  {
    "id": "kitchen_high_storage",
    "space": "kitchen",
    "name": "常用物品取放高度不适",
    "level": "中",
    "riskType": "取物风险",
    "evidence": [
      "常用物品位于高吊柜或低柜深处",
      "取物需要踮脚或弯腰",
      "重物移动时缺少支撑"
    ],
    "rule": "高处/低处取物 + 重心偏移 + 手部负重",
    "action": "把常用物下移到胸腰高度，重物放在易拿取层，必要时由设计师校核收纳布局",
    "recommendedProductIds": [
      "layout_review"
    ],
    "requiresReview": true
  },
  {
    "id": "kitchen_turning_space",
    "space": "kitchen",
    "name": "冰箱和操作台之间转身空间不足",
    "level": "中",
    "riskType": "通行障碍",
    "evidence": [
      "冰箱门开启后压缩通道",
      "操作区临时堆物较多",
      "双手端物时转身余量不足"
    ],
    "rule": "狭窄通道 + 双手持物 + 转身动作",
    "action": "整理操作台和地面堆放，保留连续转身空间，必要时调整冰箱开门方向",
    "recommendedProductIds": [
      "layout_review"
    ],
    "requiresReview": false
  },
  {
    "id": "sofa_stand_support",
    "space": "living",
    "name": "沙发起身支撑不足",
    "level": "中高",
    "riskType": "起身障碍",
    "evidence": [
      "沙发坐深较深或过软",
      "旁侧缺少稳定扶手",
      "老人起身时需要借力"
    ],
    "rule": "低位坐姿 + 支撑不足 + 膝髋力量下降",
    "action": "调整常坐位置，增加稳定扶手或选择更易起身的座椅",
    "recommendedProductIds": [
      "sofa_assist",
      "layout_review"
    ],
    "requiresReview": true
  },
  {
    "id": "living_rug_edge",
    "space": "living",
    "name": "地毯或茶几边缘形成绊倒点",
    "level": "中",
    "riskType": "绊倒",
    "evidence": [
      "地毯边缘可能翘起",
      "茶几位于高频动线",
      "夜间经过时识别难度增加"
    ],
    "rule": "地面边缘 + 高频动线 + 夜间视觉下降",
    "action": "固定地毯边缘，调整茶几位置或增加防撞保护",
    "recommendedProductIds": [
      "rug_grippers",
      "corner_guard"
    ],
    "requiresReview": false
  },
  {
    "id": "living_light_gap",
    "space": "living",
    "name": "客厅到卧室动线存在暗区",
    "level": "中",
    "riskType": "视觉识别",
    "evidence": [
      "沙发到卧室或卫生间方向光线不连续",
      "开关位置离常坐点较远",
      "夜间起身频率较高"
    ],
    "rule": "夜间动线 + 照明断点 + 老年视觉适应延迟",
    "action": "补充低眩光感应灯，覆盖沙发旁、转角和门口位置",
    "recommendedProductIds": [
      "motion_night_light",
      "motion_light_bar"
    ],
    "requiresReview": false
  },
  {
    "id": "balcony_threshold_risk",
    "space": "balcony",
    "name": "阳台门槛或轨道高差明显",
    "level": "中高",
    "riskType": "绊倒",
    "evidence": [
      "推拉门轨道形成连续高差",
      "晾晒时双手持物",
      "雨天或洗衣后地面可能湿滑"
    ],
    "rule": "高差点位 + 双手持物 + 地面湿滑",
    "action": "采用坡化垫或轨道缓坡处理，高差较大时进入人工复核",
    "recommendedProductIds": [
      "threshold_ramp",
      "anti_slip_strips",
      "layout_review"
    ],
    "requiresReview": true
  },
  {
    "id": "balcony_wet_floor",
    "space": "balcony",
    "name": "阳台地面积水湿滑",
    "level": "中",
    "riskType": "跌倒",
    "evidence": [
      "洗衣机和排水口周边可能积水",
      "地面材质反光",
      "晾晒区站立频率高"
    ],
    "rule": "积水区域 + 晾晒动作 + 防滑不足",
    "action": "补充防滑垫或局部防滑处理，保持排水口周边干燥通畅",
    "recommendedProductIds": [
      "anti_slip_coating",
      "anti_slip_strips"
    ],
    "requiresReview": false
  },
  {
    "id": "balcony_reach_risk",
    "space": "balcony",
    "name": "晾晒取物需要踮脚伸手",
    "level": "中",
    "riskType": "取物风险",
    "evidence": [
      "晾衣杆高度偏高",
      "取物时身体前倾",
      "旁侧缺少稳定支撑点"
    ],
    "rule": "高处取物 + 重心前移 + 支撑不足",
    "action": "降低常用晾晒高度，设置可升降晾衣杆或稳定支撑点",
    "recommendedProductIds": [
      "layout_review"
    ],
    "requiresReview": true
  }
];

export const products = [
  {
    "id": "anti_slip_coating",
    "name": "湿区防滑处理服务",
    "category": "地面防滑",
    "subtitle": "淋浴区防滑铺设与地面处理，适合需要整体改善的家庭",
    "imageUrl": "/assets/products/anti-slip-service.jpg",
    "shop": "社区适老施工服务",
    "rating": 4.9,
    "reviews": 88,
    "sales": 246,
    "specs": [
      "湿区适用",
      "上门处理",
      "复扫确认"
    ],
    "guarantees": [
      "施工验收",
      "防滑复测",
      "质保 6 个月"
    ],
    "riskIds": [
      "slippery_floor",
      "kitchen_slippery_floor",
      "balcony_wet_floor"
    ],
    "budgetMin": 300,
    "budgetMax": 800,
    "condition": "适用于淋浴区、坐便区等湿滑点位",
    "review": "建议复核",
    "requiresReview": true
  }
];
