# 直播推流设置

配置直播推流参数时，使用本模块 (`live-setting`)。使用 **Tabs 分组** + **Switch / InputNumber / Input** 控件构建表单，提交时通过 `window.sendToAgent({ type: 'config_submit', data: result })` 发送完整 JSON。

## 输出 schema（提交给服务器的结构）

```json
{
  "sched": {
    "lls_enabled": true,
    "rtmpq_enabled": false,
    "rtmpk_enabled": false,
    "rtmps_enabled": false
  },
  "sdk": {
    "PushBase": {
      "rtsEngineConfig": "<JSON 字符串，见下方 rtx_fec / tccbwe 结构>",
      "rtsEngineVersion": 2,
      "rtsHttpTimeout": 10000,
      "rtsIceInactiveTimeout": 12000,
      "rtsIceUnwritableTimeout": 10000,
      "uploadLogInterval": 1000,
      "rtsPushQuery": "tcc=false"
    },
    "Common": { "enableProtocolDegrade": true },
    "Switch": { "rtsPushEmptyNode": true }
  }
}
```

`rtsEngineConfig` 的 JSON 结构（序列化后的字符串）：

```json
{
  "engine_VNM": {
    "rtx_fec": {
      "enable_delayed_frames_render": true,
      "enable_smooth_sync": true,
      "enable_sync_monitor": true,
      "enable_smooth_render": true,
      "max_smooth_delay": 2000,
      "smooth_ratio": 0.15,
      "smooth_win_size": 20000,
      "stall_threshold": 200,
      "flv_sync_ratio": 0.0,
      "min_target_delay": 300,
      "resend_times": 15
    },
    "tccbwe": {
      "enable": true,
      "intergrate_tcc": true,
      "tcc_min_bwe": 200,
      "theshtime": 10,
      "threshhigh": 600,
      "threshlow": 6
    }
  }
}
```

## 字段规范

| 分组         | 字段                         | 类型   | 默认        | 约束 / 说明          |
| ------------ | ---------------------------- | ------ | ----------- | -------------------- |
| **sched**    | lls_enabled                  | switch | true        | 启用 LLS 低延迟流    |
|              | rtmpq_enabled                | switch | false       | RTMP-Q 协议          |
|              | rtmpk_enabled                | switch | false       | RTMP-K 协议          |
|              | rtmps_enabled                | switch | false       | RTMP-S 协议          |
| **PushBase** | rtsEngineVersion             | number | 2           | 固定值，可禁用或只读 |
|              | rtsHttpTimeout               | number | 10000       | 3000–60000，单位 ms  |
|              | rtsIceInactiveTimeout        | number | 12000       | ≥0，单位 ms          |
|              | rtsIceUnwritableTimeout      | number | 10000       | ≥0，单位 ms          |
|              | uploadLogInterval            | number | 1000        | ≥0，单位 ms          |
|              | rtsPushQuery                 | input  | "tcc=false" | 推流 Query 参数      |
| **rtx_fec**  | enable_delayed_frames_render | switch | true        | 延迟帧渲染           |
|              | enable_smooth_sync           | switch | true        | 平滑同步             |
|              | enable_sync_monitor          | switch | true        | 同步监控             |
|              | enable_smooth_render         | switch | true        | 平滑渲染             |
|              | max_smooth_delay             | number | 2000        | ≥0                   |
|              | smooth_ratio                 | number | 0.15        | 0–1，步长 0.01       |
|              | smooth_win_size              | number | 20000       | ≥0                   |
|              | stall_threshold              | number | 200         | ≥0                   |
|              | flv_sync_ratio               | number | 0.0         | 0–1                  |
|              | min_target_delay             | number | 300         | ≥0                   |
|              | resend_times                 | number | 15          | ≥0                   |
| **tccbwe**   | enable                       | switch | true        | 启用 TCC             |
|              | intergrate_tcc               | switch | true        | 集成 TCC             |
|              | tcc_min_bwe                  | number | 200         | ≥0                   |
|              | theshtime                    | number | 10          | ≥0                   |
|              | threshhigh                   | number | 600         | ≥0                   |
|              | threshlow                    | number | 6           | ≥0                   |
| **Common**   | enableProtocolDegrade        | switch | true        | 协议降级             |
| **Switch**   | rtsPushEmptyNode             | switch | true        | 推空节点             |

## 实现要点

1. **分组**：用 Tabs 将 sched、PushBase（含 rtx_fec / tccbwe）、Common&Switch 分页展示，减少单页复杂度。
2. **控件**：布尔用 switch，数值用 InputNumber（带 min/max），短文本用 Input。
3. **rtsEngineConfig**：表单内用扁平字段收集 rtx_fec、tccbwe 的值，提交前拼成 `engine_VNM` 对象并 `JSON.stringify` 赋给 `rtsEngineConfig`，用户无需手写 JSON。
4. **提交**：提供「生成 JSON」或「提交」按钮，点击后构造完整对象并调用 `window.sendToAgent({ type: 'config_submit', data: result })`。
5. **复制**：可选提供复制按钮，将 JSON 写入剪贴板。
6. **技术选型**：结构复杂且含嵌套 JSON，优先用 RawHTML 实现完整控制；若使用 FormRenderer，需考虑 rtsEngineConfig 的扁平化与重组逻辑。
