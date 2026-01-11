<template>
  <div class="plan-content">
    <div v-if="loading" class="loading">正在生成，请稍候…</div>
    <div v-else-if="!plan" class="plan-placeholder">
      <div class="plan-placeholder-icon">🗺️</div>
      <h3>旅行规划等待生成</h3>
      <p>点击左侧"发送"按钮，我将根据我们的对话为您生成详细的旅行规划。</p>
      <p>您的规划将包括：</p>
      <p>• 每日行程安排</p>
      <p>• 酒店和餐饮推荐</p>
      <p>• 预算分配建议</p>
      <p>• 当地体验和文化活动</p>
      <button @click="$emit('regenerate')" class="btn">生成行程</button>
    </div>

    <div v-else class="plan">
      <pre>{{ plan }}</pre>
      <button @click="$emit('regenerate')" class="btn">修改此计划，让它更像你自己</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ plan: { type: String, default: '' }, loading: { type: Boolean, default: false } })
</script>

<style scoped>
.plan-content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
}

.plan-placeholder {
  text-align: center;
  max-width: 400px;
}

.plan-placeholder-icon {
  font-size: 60px;
  margin-bottom: 20px;
  color: #ddd;
}

.plan-placeholder h3 {
  font-size: 22px;
  margin-bottom: 12px;
  color: #666;
}

.plan-placeholder p {
  margin-bottom: 8px;
  line-height: 1.6;
}

.btn {
  background-color: #7b61ff;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 28px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 25px;
  width: 100%;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #6d52e8;
}

.loading {
  color: #6b7280;
  padding: 12px;
}

.plan {
  white-space: pre-wrap;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  margin-top: 12px;
  width: 100%;
  text-align: left;
}

@media (max-width: 900px) {
  .plan-content {
    padding: 20px;
  }
}
</style>