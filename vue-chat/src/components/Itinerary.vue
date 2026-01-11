<template>
  <aside class="itinerary">
    <header class="it-header">
      <h3>旅行行程计划</h3>
      <div class="actions">
        <button @click="$emit('regenerate')" class="regen">重新生成</button>
      </div>
    </header>

    <div v-if="loading" class="loading">正在生成，请稍候…</div>
    <div v-else-if="!plan" class="empty">尚未生成行程，聊天结束后或点击“完成”生成。</div>

    <div v-else class="plan">
      <pre>{{ plan }}</pre>
    </div>
  </aside>
</template>

<script setup>
const props = defineProps({ plan: { type: String, default: '' }, loading: { type: Boolean, default: false } })
</script>

<style scoped>
.itinerary { width: 420px; background:white; padding:18px; box-sizing:border-box; border-left:1px solid #e5e7eb }
.it-header { display:flex; justify-content:space-between; align-items:center }
.regen { background:#7c3aed;color:white;padding:6px 10px;border-radius:8px;border:none }
.loading { color:#6b7280; padding:12px }
.empty { color:#9ca3af; padding:12px }
.plan { white-space:pre-wrap; font-family: Inter, monospace; margin-top:12px }
@media (max-width: 900px) { .itinerary { width:100%; order:2 } }
</style>