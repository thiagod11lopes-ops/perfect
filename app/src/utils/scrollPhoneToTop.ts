/** Zera rolagem da janela e dos contêineres scrolláveis do simulador /celular. */
export function scrollPhoneContentToTop() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  const scope = document.querySelector('.phone-app') ?? document
  scope.querySelectorAll('.main, .app-shell, .mobile-main').forEach((node) => {
    if (node instanceof HTMLElement) node.scrollTop = 0
  })
}