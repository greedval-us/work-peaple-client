<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand-mark" aria-hidden="true">W</div>
      <div>
        <p class="brand-name">Work People</p>
        <p class="brand-caption">Рабочее пространство компании</p>
      </div>
      <span class="stage-label">Начальная настройка</span>
    </header>
    <main class="main-content">
      <div class="page-intro">
        <p class="eyebrow">Подключение</p>
        <h1 class="page-title">Проверка рабочего пространства</h1>
        <p class="page-description">Состояние сервера и сервисов, необходимых для работы приложения.</p>
      </div>
      <slot />
    </main>
    <footer class="app-footer">Work People · Технический каркас приложения</footer>
  </div>
</template>

<style scoped>
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }
.app-header { display: flex; align-items: center; gap: 12px; padding: 24px 40px; border-bottom: 1px solid var(--border); background: var(--surface); }
.brand-mark { display: grid; place-items: center; width: 40px; height: 40px; background: var(--accent); color: white; border-radius: 10px; font-size: 23px; font-weight: 750; }
.brand-name { margin: 0; font-weight: 700; letter-spacing: -0.02em; }
.brand-caption { margin: 2px 0 0; font-size: 12px; color: var(--muted); }
.stage-label { margin-left: auto; font-size: 12px; color: var(--muted); }
.main-content { width: min(100% - 80px, 760px); margin: 56px auto; flex: 1; }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
.page-title { margin: 12px 0; font-size: clamp(26px, 3.4vw, 34px); font-weight: 650; line-height: 1.2; letter-spacing: -0.035em; }
.page-description { margin: 0 0 32px; max-width: 560px; color: var(--muted); line-height: 1.65; }
.app-footer { padding: 20px 40px; color: var(--muted); font-size: 12px; }
@media (max-width: 760px) { .app-header { padding: 20px 24px; } .main-content { width: calc(100% - 48px); margin: 36px auto; } .stage-label { display: none; } .app-footer { padding: 20px 24px; } }
</style>
