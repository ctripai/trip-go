<template>
  <aside :class="['sidebar', { open: open }]">
    <div class="sidebar-inner">
      <h2>Layla.</h2>
      <p class="muted">嗨，我是 Layla！很高兴帮助你规划旅行。</p>
      <button class="primary">创建一个新行程</button>

      <div class="premium">
        <p>升级订阅以解锁：</p>
        <ul>
          <li>无限次专属行程规划</li>
          <li>一键下载并分享精美 PDF</li>
          <li>挖掘隐藏宝藏景点</li>
        </ul>
        <button class="cta">开始 3 天免费试用</button>
      </div>
    </div>
    <button class="sidebar-toggle" @click="$emit('toggle')">{{ open ? '收起' : '展开' }}</button>
  </aside>
</template>

<script setup>
const props = defineProps({ open: { type: Boolean, default: true } })
</script>

<style scoped>
.sidebar { width:320px; background:white; padding:24px; box-sizing:border-box; position:relative; transition: transform .18s ease }
.sidebar.open { transform: translateX(0) }
.sidebar-toggle { position:absolute; right:-44px; top:20px }
.primary { background:#9b5cf6;color:white;padding:8px 14px;border-radius:16px;border:none;cursor:pointer }
.premium { margin-top: 20px }
.cta { margin-top: 12px; background:#2d3748;color:white;padding:8px 12px;border-radius:14px;border:none;cursor:pointer }
.muted { color: #6b7280 }
</style>