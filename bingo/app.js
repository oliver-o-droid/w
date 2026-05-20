/**
 * @file app.js
 * @description Lógica de la web externa para gestionar listas de Bingo, plantillas e historial.
 */

// ==========================================
// 1. CONFIGURACIÓN DE LA URL DE LA API
// ==========================================
// REEMPLAZA esta URL con el enlace de la Aplicación Web publicada de tu script en Google Apps Script.
// Ejemplo: const API_URL = 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec';
const API_URL = 'https://script.google.com/macros/s/AKfycbzhY2q22XX1N2N2cNFp4oA8YOlKDyYf9JmYexUr1N4UT3Du_XhIIIbXw0S_bger3UVXRw/exec'; 

// ==========================================
// 2. FUNCIÓN DE COMUNICACIÓN CON LA API (EVITA CORS)
// ==========================================
/**
 * Envía peticiones HTTP al Apps Script.
 * Usa GET para lecturas y POST (x-www-form-urlencoded) para escrituras masivas, evitando preflight CORS (OPTIONS).
 */
async function callApi(params, method = 'GET') {
    if (!API_URL || API_URL.includes('AKfycb...')) {
        throw new Error('⚠️ Debes configurar la constante API_URL al inicio de app.js con el enlace de tu Aplicación Web de Google Apps Script.');
    }

    try {
        if (method === 'GET') {
            const query = new URLSearchParams(params).toString();
            const response = await fetch(`${API_URL}?${query}`, {
                method: 'GET',
                mode: 'cors'
            });
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            return await response.json();
        } else {
            const body = new URLSearchParams(params);
            const response = await fetch(API_URL, {
                method: 'POST',
                body: body,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                mode: 'cors'
            });
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            return await response.json();
        }
    } catch (err) {
        console.error('Error en llamada API:', err);
        throw err;
    }
}

// ==========================================
// 3. SELECCIÓN DE ELEMENTOS DE LA INTERFAZ
// ==========================================
const loginView = document.getElementById('loginView');
const setupView = document.getElementById('setupView');
const mainView = document.getElementById('mainView');

// Componentes Login
const codigoInput = document.getElementById('codigoUsuario');
const btnVerificar = document.getElementById('btnVerificar');
const mensajeLogin = document.getElementById('mensajeLogin');

// Componentes Setup
const setupTexto1 = document.getElementById('setupTexto1');
const setupTexto2 = document.getElementById('setupTexto2');
const setupCsvFile = document.getElementById('setupCsvFile');
const btnSetup = document.getElementById('btnSetup');
const btnSetupCancel = document.getElementById('btnSetupCancel');
const mensajeSetup = document.getElementById('mensajeSetup');

// Componentes Dashboard
const currentUserIdTag = document.getElementById('currentUserId');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const bannerTexto1 = document.getElementById('texto1');
const bannerTexto2 = document.getElementById('texto2');

// ==========================================
// 4. FLUJO DE INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Comprobar si hay sesión iniciada en localStorage
    const savedUserId = localStorage.getItem('bingo_user_id');
    if (savedUserId) {
        autoVerificarUsuario(savedUserId);
    }

    // Eventos Login
    btnVerificar.addEventListener('click', () => verificarUsuarioManual());
    codigoInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') verificarUsuarioManual();
    });

    // Eventos Setup
    btnSetupCancel.addEventListener('click', () => {
        switchView('login');
    });

    // Eventos Dashboard
    btnCerrarSesion.addEventListener('click', cerrarSesion);
    
    // Navegación por Pestañas
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
});

// Cambiar de vista principal en la SPA
function switchView(viewName) {
    loginView.classList.remove('active-view');
    setupView.classList.remove('active-view');
    mainView.classList.remove('active-view');

    if (viewName === 'login') {
        loginView.classList.add('active-view');
    } else if (viewName === 'setup') {
        setupView.classList.add('active-view');
    } else if (viewName === 'main') {
        mainView.classList.add('active-view');
    }
}

// ==========================================
// 5. CONTROLADOR DE ACCESO (LOGIN & VERIFY)
// ==========================================
async function autoVerificarUsuario(id) {
    switchView('login');
    setLoading(btnVerificar, true, 'Autenticando');
    
    try {
        const res = await callApi({ action: 'verificarUsuario', id: id });
        setLoading(btnVerificar, false, 'Verificar y Entrar');
        
        if (res.status === 'ok') {
            iniciarSesionExitoso(id);
        } else if (res.status === 'setup_required') {
            mostrarSetup(id);
        } else {
            localStorage.removeItem('bingo_user_id');
            showError(mensajeLogin, res.message);
        }
    } catch (err) {
        setLoading(btnVerificar, false, 'Verificar y Entrar');
        showError(mensajeLogin, 'Error al conectar con la API de Google. Verifica API_URL o la conexión.');
    }
}

async function verificarUsuarioManual() {
    const id = codigoInput.value.trim();
    if (!id) {
        showError(mensajeLogin, 'Por favor, escribe el código de tu proyecto.');
        return;
    }
    
    mensajeLogin.style.display = 'none';
    setLoading(btnVerificar, true, 'Verificando');
    
    try {
        const res = await callApi({ action: 'verificarUsuario', id: id });
        setLoading(btnVerificar, false, 'Verificar y Entrar');
        
        if (res.status === 'ok') {
            localStorage.setItem('bingo_user_id', id);
            iniciarSesionExitoso(id);
        } else if (res.status === 'setup_required') {
            mostrarSetup(id);
        } else {
            showError(mensajeLogin, res.message);
        }
    } catch (err) {
        setLoading(btnVerificar, false, 'Verificar y Entrar');
        showError(mensajeLogin, 'Error de conexión. Asegúrate de configurar la URL correcta en app.js.');
    }
}

function iniciarSesionExitoso(id) {
    currentUserIdTag.textContent = id;
    switchView('main');
    
    // Configurar controladores de pestañas
    document.getElementById('btnAgregarPlantilla').onclick = () => agregarPlantilla(id);
    document.getElementById('btnInstrucciones').onclick = mostrarInstrucciones;
    
    // Cargar pestaña inicial (Lista de canciones)
    switchTab('tab-songs');
}

function cerrarSesion() {
    localStorage.removeItem('bingo_user_id');
    codigoInput.value = '';
    switchView('login');
}

// ==========================================
// 6. FLUJO DE CONFIGURACIÓN INICIAL (SETUP)
// ==========================================
function mostrarSetup(id) {
    document.getElementById('setupUserName').textContent = id;
    setupTexto1.value = '';
    setupTexto2.value = '';
    setupCsvFile.value = '';
    mensajeSetup.style.display = 'none';
    
    btnSetup.onclick = () => ejecutarSetup(id);
    switchView('setup');
}

async function ejecutarSetup(id) {
    const texto1 = setupTexto1.value.trim();
    const texto2 = setupTexto2.value.trim();
    const file = setupCsvFile.files[0];
    
    if (!texto1 || !file) {
        showError(mensajeSetup, 'El Título del Cartón y el archivo CSV son obligatorios.');
        return;
    }
    
    setLoading(btnSetup, true, 'Configurando');
    mensajeSetup.style.display = 'none';
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const csvData = event.target.result;
        try {
            const res = await callApi({
                action: 'setupUsuario',
                id: id,
                texto1: texto1,
                texto2: texto2,
                csvData: csvData
            }, 'POST');
            
            setLoading(btnSetup, false, 'Crear Configuración');
            
            if (res.status === 'ok') {
                localStorage.setItem('bingo_user_id', id);
                iniciarSesionExitoso(id);
            } else {
                showError(mensajeSetup, res.message);
            }
        } catch (err) {
            setLoading(btnSetup, false, 'Crear Configuración');
            showError(mensajeSetup, 'Error de conexión durante el setup del proyecto.');
        }
    };
    reader.readAsText(file, 'UTF-8');
}

// ==========================================
// 7. GESTIÓN DE PESTAÑAS DEL PANEL
// ==========================================
function switchTab(tabId) {
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(p => p.classList.remove('active'));
    
    const activePanel = document.getElementById(tabId);
    if (activePanel) activePanel.classList.add('active');
    
    const userId = localStorage.getItem('bingo_user_id');
    
    if (tabId === 'tab-songs') {
        cargarListaCanciones(userId);
    } else if (tabId === 'tab-generate') {
        cargarPlantillas(userId);
    } else if (tabId === 'tab-history') {
        cargarHistorial(userId);
    }
}

// --- Pestaña 1: Lista de Canciones ---
async function cargarListaCanciones(id) {
    const tbody = document.getElementById('songsTableBody');
    const msgSongs = document.getElementById('mensajeSongs');
    
    tbody.innerHTML = '<tr><td colspan="4"><div class="loading-container"><div class="spinner spinner-large"></div><span>Obteniendo canciones de la hoja...</span></div></td></tr>';
    msgSongs.style.display = 'none';
    
    try {
        const res = await callApi({ action: 'obtenerDatosUsuario', id: id });
        if (res.status === 'ok') {
            bannerTexto1.textContent = res.data.texto1;
            bannerTexto2.textContent = res.data.texto2;
            
            tbody.innerHTML = '';
            
            if (!res.data.canciones || res.data.canciones.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">No hay canciones configuradas. Sube un archivo en configuración.</td></tr>';
                return;
            }
            
            res.data.canciones.forEach(c => {
                const row = tbody.insertRow();
                
                const tdNum = document.createElement('td');
                tdNum.style.textAlign = 'center';
                tdNum.style.fontWeight = '700';
                tdNum.style.color = 'var(--primary-color)';
                tdNum.textContent = c.numero;
                
                const tdTitle = document.createElement('td');
                tdTitle.textContent = c.titulo;
                
                const tdArtist = document.createElement('td');
                tdArtist.textContent = c.artista;
                
                const tdLink = document.createElement('td');
                tdLink.style.textAlign = 'center';
                if (c.spotifyTrackId) {
                    tdLink.innerHTML = `<a href="https://open.spotify.com/track/${c.spotifyTrackId}" target="_blank" class="spotify-pill">Escuchar</a>`;
                } else {
                    tdLink.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>`;
                }
                
                row.appendChild(tdNum);
                row.appendChild(tdTitle);
                row.appendChild(tdArtist);
                row.appendChild(tdLink);
            });
            
            // Asignar eventos de generación PDF/HTML
            document.getElementById('btnGenerarPdf').onclick = () => generarArchivoLista(id, 'generarPdfListaCanciones', 'PDF');
            document.getElementById('btnGenerarHtml').onclick = () => generarArchivoLista(id, 'generarHtmlListaCanciones', 'HTML');
            document.getElementById('btnBorrarLista').onclick = () => ejecutarBorradoLista(id);
            
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--error-color); padding: 20px;">Error: ${res.message}</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--error-color); padding: 20px;">Fallo al cargar canciones de la API.</td></tr>';
    }
}

async function generarArchivoLista(id, action, type) {
    const msgSongs = document.getElementById('mensajeSongs');
    msgSongs.className = 'mensaje';
    msgSongs.innerHTML = `Generando archivo ${type}... <div class="spinner" style="width: 14px; height: 14px; margin-left: 8px;"></div>`;
    msgSongs.style.display = 'block';
    
    try {
        const res = await callApi({ action: action, id: id });
        if (res.status === 'ok') {
            msgSongs.className = 'mensaje success';
            msgSongs.innerHTML = `¡Generado! <a href="${res.url}" target="_blank" style="color: var(--success-color); font-weight: 700; text-decoration: underline;">Descargar archivo ${type} del Bingo</a>`;
        } else {
            msgSongs.className = 'mensaje error';
            msgSongs.textContent = `Error al generar: ${res.message}`;
        }
    } catch (err) {
        msgSongs.className = 'mensaje error';
        msgSongs.textContent = 'Error de comunicación durante la generación.';
    }
}

async function ejecutarBorradoLista(id) {
    const confirmar = confirm(`⚠️ ¿Estás seguro de que quieres borrar la lista de canciones de este proyecto?\n\nEsta acción eliminará la configuración y los datos asociados de la hoja de cálculo. Tendrás que volver a subir la lista CSV.`);
    if (!confirmar) return;

    const btn = document.getElementById('btnBorrarLista');
    setLoading(btn, true, 'Borrando');

    try {
        const res = await callApi({
            action: 'borrarDatosUsuario',
            id: id
        }, 'POST');

        setLoading(btn, false, 'Borrar Lista');

        if (res.status === 'ok') {
            alert('¡Lista de canciones borrada con éxito!');
            // Redirigir a la vista de setup para este mismo usuario
            mostrarSetup(id);
        } else {
            alert(`Error al borrar la lista: ${res.message}`);
        }
    } catch (err) {
        setLoading(btn, false, 'Borrar Lista');
        alert('Error de conexión al intentar borrar la lista.');
    }
}

// --- Pestaña 2: Generación de Cartones por Plantilla ---
async function cargarPlantillas(id) {
    const listWrapper = document.getElementById('listaPlantillas');
    listWrapper.innerHTML = '<div class="loading-container"><div class="spinner spinner-large"></div><span>Cargando plantillas de Google Drive...</span></div>';
    
    try {
        const res = await callApi({ action: 'obtenerPlantillas', id: id });
        if (res.status === 'ok') {
            listWrapper.innerHTML = '';
            
            if (res.data.length === 0) {
                listWrapper.innerHTML = '<p style="padding: 24px; text-align: center; color: var(--text-muted);">No hay plantillas de cartón configuradas.</p>';
                return;
            }
            
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Plantilla</th>
                        <th style="text-align: right; width: 440px;">Configuración y Creación</th>
                    </tr>
                </thead>
            `;
            const tbody = table.createTBody();
            
            res.data.forEach(p => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td style="font-weight: 600; vertical-align: middle;">${p.nombre}</td>
                    <td style="text-align: right; vertical-align: middle;">
                        <div id="controls-${p.docId}" style="display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex-wrap: wrap;">
                            <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                                <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Primer Cartón</label>
                                <input type="number" id="cartonInicial-${p.docId}" value="1" min="1" style="width: 90px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                                <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Cant. Hojas (Máx. 10)</label>
                                <input type="number" id="numPaginas-${p.docId}" value="10" min="1" max="10" style="width: 90px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 18px;" class="actions-wrapper">
                                <a href="${p.enlace}" target="_blank" class="btn btn-outline btn-sm">Ver</a>
                                <button class="btn btn-primary btn-sm" id="btnGen-${p.docId}">Generar</button>
                            </div>
                        </div>
                        <div id="progress-${p.docId}" class="log-console" style="display: none;"></div>
                    </td>
                `;
                tbody.appendChild(row);
            });
            listWrapper.appendChild(table);
            
            // Asignar eventos de click a botones de generación creados
            res.data.forEach(p => {
                document.getElementById(`btnGen-${p.docId}`).onclick = () => iniciarGeneracionCartones(id, p.docId);
            });
            
        } else {
            listWrapper.innerHTML = `<p class="mensaje error" style="margin: 16px;">Error: ${res.message}</p>`;
        }
    } catch (err) {
        listWrapper.innerHTML = '<p class="mensaje error" style="margin: 16px;">Error de red al cargar las plantillas.</p>';
    }
}

async function iniciarGeneracionCartones(id, plantillaDocId) {
    const controls = document.getElementById(`controls-${plantillaDocId}`);
    const consoleLogs = document.getElementById(`progress-${plantillaDocId}`);
    
    let cartonInicial = parseInt(document.getElementById(`cartonInicial-${plantillaDocId}`).value, 10) || 1;
    let numPaginas = parseInt(document.getElementById(`numPaginas-${plantillaDocId}`).value, 10) || 10;
    
    // Limitar el número máximo de páginas a 10 para evitar problemas de cuota o timeouts
    if (numPaginas > 10) {
        numPaginas = 10;
        document.getElementById(`numPaginas-${plantillaDocId}`).value = 10;
    }
    if (numPaginas < 1) {
        numPaginas = 1;
        document.getElementById(`numPaginas-${plantillaDocId}`).value = 1;
    }
    
    controls.style.display = 'none';
    consoleLogs.innerHTML = '';
    consoleLogs.style.display = 'block';
    
    const writeLog = (msg) => {
        const div = document.createElement('div');
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        consoleLogs.appendChild(div);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    };
    
    try {
        writeLog('1. Creando copia de plantilla y obteniendo lista de cartones...');
        const resInit = await callApi({
            action: 'iniciarDocumentoCompleto',
            id: id,
            plantillaDocId: plantillaDocId
        }, 'POST');
        
        const docFinalId = resInit.docFinalId;
        const todosLosCartones = resInit.todosLosCartones;
        
        writeLog(`-> Documento de trabajo creado con éxito en Google Drive.`);
        
        let cartonActual = cartonInicial;
        for (let i = 0; i < numPaginas; i++) {
            const cartonesParaPagina = [];
            const idsCartones = [];
            
            // Cada página contiene 3 cartones de Bingo
            for (let j = 0; j < 3; j++) {
                if (todosLosCartones[cartonActual]) {
                    cartonesParaPagina.push(todosLosCartones[cartonActual]);
                    idsCartones.push(String(cartonActual).padStart(3, '0'));
                }
                cartonActual++;
            }
            
            if (cartonesParaPagina.length > 0) {
                writeLog(`2.${i + 1}. Escribiendo página ${i + 1}/${numPaginas} (Cartones: ${idsCartones.join(', ')})...`);
                await callApi({
                    action: 'generarPaginaDocumento',
                    id: id,
                    docFinalId: docFinalId,
                    plantillaDocId: plantillaDocId,
                    cartonesPagina: JSON.stringify(cartonesParaPagina)
                }, 'POST');
            } else {
                writeLog('⚠️ No quedan más cartones disponibles en el listado. Se detiene el proceso.');
                break;
            }
        }
        
        writeLog('3. Compilando PDF y finalizando enlaces en la nube...');
        const resFinal = await callApi({
            action: 'finalizarDocumentoCompleto',
            id: id,
            docFinalId: docFinalId,
            plantillaDocId: plantillaDocId,
            cartonInicial: String(cartonInicial),
            numPaginas: String(numPaginas)
        }, 'POST');
        
        writeLog('✅ ¡Cartones generados con éxito!');
        
        const nuevoCartonInicial = cartonInicial + (numPaginas * 3);
        consoleLogs.innerHTML = `
            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding-top: 4px;">
                <a href="${resFinal.docUrl}" target="_blank" class="btn btn-secondary btn-sm" style="background-color:#2563eb; color:white;">Abrir Doc</a>
                <a href="${resFinal.pdfUrl}" target="_blank" class="btn btn-secondary btn-sm" style="background-color:#dc2626; color:white;">Ver PDF</a>
                <button class="btn btn-primary btn-sm" id="btnMore-${plantillaDocId}">Generar más</button>
            </div>
        `;
        
        document.getElementById(`btnMore-${plantillaDocId}`).onclick = () => {
            document.getElementById(`cartonInicial-${plantillaDocId}`).value = nuevoCartonInicial;
            consoleLogs.style.display = 'none';
            controls.style.display = 'flex';
        };
        
    } catch (err) {
        writeLog(`❌ Error en el proceso: ${err.message || 'Error desconocido'}`);
        const btnReset = document.createElement('button');
        btnReset.className = 'btn btn-outline btn-sm';
        btnReset.style.marginTop = '8px';
        btnReset.textContent = 'Volver a intentar';
        btnReset.onclick = () => {
            consoleLogs.style.display = 'none';
            controls.style.display = 'flex';
        };
        consoleLogs.appendChild(btnReset);
    }
}

async function agregarPlantilla(id) {
    const nombreInput = document.getElementById('plantillaNombre');
    const enlaceInput = document.getElementById('plantillaEnlace');
    const btn = document.getElementById('btnAgregarPlantilla');
    
    const nombre = nombreInput.value.trim();
    const enlace = enlaceInput.value.trim();
    
    if (!nombre || !enlace) {
        alert('Debes escribir un nombre y pegar el enlace de Google Docs.');
        return;
    }
    
    setLoading(btn, true, 'Guardando');
    
    try {
        const res = await callApi({
            action: 'agregarPlantilla',
            id: id,
            nombre: nombre,
            enlace: enlace
        }, 'POST');
        
        setLoading(btn, false, 'Añadir Plantilla');
        
        if (res.status === 'ok') {
            alert(res.message);
            nombreInput.value = '';
            enlaceInput.value = '';
            cargarPlantillas(id); // Recargar la tabla
        } else {
            alert(`Error: ${res.message}`);
        }
    } catch (err) {
        setLoading(btn, false, 'Añadir Plantilla');
        alert('Error al guardar la plantilla en el servidor.');
    }
}

function mostrarInstrucciones() {
    alert(`Instrucciones para Plantillas Personalizadas:\n\n` +
          `1. Entra a una plantilla existente haciendo clic en "Ver".\n` +
          `2. En Google Docs, haz una copia ('Archivo' > 'Hacer una copia') en tu propio Google Drive.\n` +
          `3. Modifica el diseño visual a tu gusto (cambia colores, fuentes, añade imágenes de fondo, etc.). Conserva las etiquetas {NUM}, {TITULO}, {ARTISTA} y {QR} intactas.\n` +
          `4. Comparte tu copia modificada para que "Cualquier persona con el enlace" sea "Lector".\n` +
          `5. Copia el enlace de compartir, escríbele un nombre de identificación y añádela desde este formulario.`);
}

// --- Pestaña 3: Historial de Cartones ---
async function cargarHistorial(id) {
    const container = document.getElementById('historyTableContainer');
    container.innerHTML = '<div class="loading-container"><div class="spinner spinner-large"></div><span>Buscando historial de generaciones...</span></div>';
    
    try {
        const res = await callApi({ action: 'obtenerHistorialGeneracion', id: id });
        if (res.status === 'ok') {
            container.innerHTML = res.html;
            
            // Si la respuesta del servidor es "no tiene generaciones anteriores" o similar (HTML plano)
            if (!res.html.includes('<table')) {
                container.innerHTML = `<p style="padding: 30px; text-align: center; color: var(--text-muted);">${res.html}</p>`;
            }
        } else {
            container.innerHTML = `<p class="mensaje error" style="margin: 16px;">Error: ${res.message}</p>`;
        }
    } catch (err) {
        container.innerHTML = '<p class="mensaje error" style="margin: 16px;">Error al conectar con la base de datos de historial.</p>';
    }
}

// ==========================================
// 8. FUNCIONES AUXILIARES (HELPERS)
// ==========================================
function setLoading(button, isLoading, text) {
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = `${text}... <span class="spinner"></span>`;
    } else {
        button.textContent = text;
    }
}

function showError(element, text) {
    element.textContent = text;
    element.style.display = 'block';
}
