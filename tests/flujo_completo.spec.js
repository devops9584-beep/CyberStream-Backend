const { test, expect } = require('@playwright/test');

test('Test de Robustez: Login -> Navegación -> Configuración', async ({ page }) => {
  // 1. PROBANDO handleLogin
  await page.goto('http://localhost:3000');
  await page.fill('input[placeholder="Email"]', 'test@c.com'); 
  await page.fill('input[placeholder="Contraseña"]', 'test@c.com');
  await page.click('button:has-text("INICIAR SESIÓN")');

  // 2. PROBANDO renderContent (Dinamismo)
  // Esperamos que el catálogo de "Inicio" sea visible
  await expect(page.locator('#media-grid')).toBeVisible();
  console.log('✅ Catálogo dinámico cargado exitosamente');

  // Simulamos click en "Películas" para ver si cambia el contenido
  await page.click('nav >> text=Películas');
  await expect(page.locator('#section-title')).toHaveText('Pelicula');

  // 3. PROBANDO openConfig (Persistencia)
  // Hacemos click en el botón de Configuración (engranaje o texto)
  await page.click('text=Configuración');

  // Verificamos que la sección de configuración sea visible
  await expect(page.locator('#config-section')).toBeVisible();

  // VALIDACIÓN CRUCIAL: 
  const configName = await page.inputValue('#conf-name');
  expect(configName).toBe('test_user'); 
  console.log('✅ Persistencia de datos en Configuración verificada');
});


