import type { Space, ScanTask } from "../services/contracts";

export const spaces: Space[] = [
  {
    id: "bathroom",
    name: "卫生间",
    scene: "湿区防跌倒",
    description: "重点检查扶手缺失、地面湿滑、门槛高差等高频风险。",
  },
  {
    id: "bedroom",
    name: "卧室",
    scene: "起夜动线",
    description: "聚焦床边起身、夜间照明、家具尖角和通行连续性。",
  },
  {
    id: "corridor",
    name: "过道/玄关",
    scene: "连续通行",
    description: "检查通道宽度、门槛、线缆杂物和夜间暗区。",
  },
  {
    id: "kitchen",
    name: "厨房",
    scene: "湿滑与取物",
    description: "检查油水湿滑、转身通道、橱柜取物高度和明火操作风险。",
  },
  {
    id: "living",
    name: "客厅",
    scene: "活动与会客",
    description: "关注沙发起身、地毯翘边、茶几边角和常用动线连续性。",
  },
  {
    id: "balcony",
    name: "阳台/露台",
    scene: "晾晒与高差",
    description: "检查门槛高差、晾晒动线、地面积水和护栏边缘风险。",
  },
];

export const scanTasks: Record<string, ScanTask[]> = {
  bathroom: [
    {
      id: "bathroom_overview",
      title: "拍摄卫生间整体空间",
      tip: "站在门口拍摄，确保地面、淋浴区、坐便器进入画面",
      target: "空间布局、动线、湿区位置",
    },
    {
      id: "shower_floor",
      title: "拍摄淋浴区和地面",
      tip: "重点拍摄地面材质、积水、是否有防滑垫",
      target: "湿滑、反光、防滑措施",
    },
    {
      id: "toilet_support",
      title: "拍摄坐便器两侧墙面",
      tip: "保持墙面和坐便器边缘完整入镜，便于判断扶手安装条件",
      target: "支撑点缺失、墙体条件",
    },
    {
      id: "threshold",
      title: "拍摄门槛或高差位置",
      tip: "从侧面拍摄高差，并放入参考物或手动补录高度",
      target: "门槛高差、绊倒风险",
    },
  ],
  bedroom: [
    {
      id: "bedside_path",
      title: "拍摄床边通道",
      tip: "从床尾或床侧拍摄，保留床沿、柜体和通行空间",
      target: "起身通道、通行宽度",
    },
    {
      id: "night_light",
      title: "拍摄床头照明",
      tip: "拍摄床头、开关和起夜方向，记录是否有感应照明",
      target: "夜间照明、开关可达性",
    },
    {
      id: "bedroom_route",
      title: "拍摄起夜动线",
      tip: "沿床到门口或卫生间方向拍摄，标出障碍物",
      target: "夜间动线、线缆杂物",
    },
    {
      id: "sharp_corner",
      title: "拍摄柜角和桌角",
      tip: "对准老人常经过的柜角、桌角和床角位置",
      target: "磕碰点、尖角风险",
    },
  ],
  corridor: [
    {
      id: "corridor_overview",
      title: "拍摄过道整体",
      tip: "站在过道端点拍摄，保证地面、墙面和转角入镜",
      target: "通行宽度、连续动线",
    },
    {
      id: "entry_threshold",
      title: "拍摄玄关门槛",
      tip: "从侧面拍摄门槛和地垫，必要时补录高差",
      target: "门槛、地垫、绊倒点",
    },
    {
      id: "wire_clutter",
      title: "拍摄地面线缆和杂物",
      tip: "重点拍摄鞋柜、插座、充电线和临时堆放物",
      target: "绊倒物、地面占用",
    },
    {
      id: "corridor_light",
      title: "拍摄过道照明",
      tip: "记录白天和夜间灯光覆盖，确认是否存在暗区",
      target: "照度不足、眩光暗区",
    },
  ],
  kitchen: [
    {
      id: "kitchen_overview",
      title: "拍摄厨房整体动线",
      tip: "站在入口拍摄，保证操作台、灶台、地面和冰箱区域进入画面",
      target: "转身空间、操作动线、地面状态",
    },
    {
      id: "kitchen_floor",
      title: "拍摄水槽和灶台前地面",
      tip: "重点拍摄水槽、灶台、常站立区域和地垫边缘",
      target: "油水湿滑、地垫翘边、防滑措施",
    },
    {
      id: "kitchen_storage",
      title: "拍摄常用橱柜和取物高度",
      tip: "拍摄老人常拿取物品的吊柜、抽屉和台面高度",
      target: "高处取物、弯腰取物、重物位置",
    },
    {
      id: "kitchen_turning",
      title: "拍摄冰箱和操作台之间通道",
      tip: "保留冰箱门开启方向和通道宽度，确认是否影响转身",
      target: "通道宽度、转身半径、临时堆物",
    },
  ],
  living: [
    {
      id: "living_overview",
      title: "拍摄客厅整体布局",
      tip: "从入口或沙发侧拍摄，保留沙发、茶几、电视柜和主要通道",
      target: "会客动线、家具间距、地面障碍",
    },
    {
      id: "sofa_stand",
      title: "拍摄沙发起身区域",
      tip: "对准老人常坐位置，拍摄扶手高度、沙发深度和旁侧空间",
      target: "起身支撑、旁侧通行、坐深高度",
    },
    {
      id: "rug_edge",
      title: "拍摄地毯和茶几边缘",
      tip: "低角度拍摄地毯翘边、茶几角和老人常经过位置",
      target: "绊倒点、磕碰点、地面连续性",
    },
    {
      id: "living_light",
      title: "拍摄客厅夜间照明",
      tip: "记录沙发到卧室、卫生间方向的夜间灯光覆盖",
      target: "夜间暗区、开关可达性、眩光",
    },
  ],
  balcony: [
    {
      id: "balcony_overview",
      title: "拍摄阳台整体空间",
      tip: "从门内拍摄，保留门槛、地面、晾衣区和护栏边缘",
      target: "门槛高差、晾晒动线、护栏边缘",
    },
    {
      id: "balcony_threshold",
      title: "拍摄阳台门槛高差",
      tip: "从侧面拍摄推拉门轨道或门槛，并放入参考物",
      target: "轨道高差、绊倒风险、辅具通过",
    },
    {
      id: "balcony_floor",
      title: "拍摄阳台地面和排水",
      tip: "重点拍摄地面积水、排水口、洗衣机周边和防滑情况",
      target: "积水湿滑、排水不畅、防滑措施",
    },
    {
      id: "balcony_drying",
      title: "拍摄晾晒取物位置",
      tip: "拍摄晾衣杆高度、取物动作空间和是否需要踮脚伸手",
      target: "高处取物、重心前倾、支撑点",
    },
  ],
};
