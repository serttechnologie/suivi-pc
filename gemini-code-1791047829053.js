document.addEventListener('DOMContentLoaded', () => {
    let pcList = JSON.parse(localStorage.getItem('pc_atelier_list')) || [];

    const modal = document.getElementById('pcModal');
    const btnNewPC = document.getElementById('btnNewPC');
    const closeBtn = document.querySelector('.close-btn');
    const pcForm = document.getElementById('pcForm');
    const searchInput = document.getElementById('searchInput');
    const pcTableBody = document.getElementById('pcTableBody');
    const partsTableBody = document.getElementById('partsTableBody');
    const btnAddPart = document.getElementById('btnAddPart');
    const btnPrintSheet = document.getElementById('btnPrintSheet');
    const btnSyncDrive = document.getElementById('btnSyncDrive');

    // Écouteurs d'événements principaux
    btnNewPC.addEventListener('click', () => openModal());
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    searchInput.addEventListener('input', renderTable);
    pcForm.addEventListener('input', calculateFinancials);
    pcForm.addEventListener('submit', savePCData);
    btnAddPart.addEventListener('click', () => addPartRow('', 0));

    // Surveillance des états pour ajout automatique des pièces
    document.querySelectorAll('.trigger-check').forEach(el => {
        el.addEventListener('change', checkMissingPartsAutomatic);
    });

    btnPrintSheet.addEventListener('click', () => {
        populatePrintArea();
        window.print();
    });

    btnSyncDrive.addEventListener('click', syncWithGoogleDriveSimulation);

    renderTable();

    function generateTrackingNumber() {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(100 + Math.random() * 900);
        return `PC-${year}-${randomNum}`;
    }

    function openModal(pc = null) {
        modal.style.display = 'block';
        partsTableBody.innerHTML = '';

        if (pc) {
            document.getElementById('modalTitle').innerText = "Modifier la Fiche PC";
            document.getElementById('pcId').value = pc.id;
            document.getElementById('trackingNum').value = pc.trackingNum;
            document.getElementById('pcModel').value = pc.model;
            document.getElementById('pcStatus').value = pc.status;
            document.getElementById('diagCharger').value = pc.charger;
            document.getElementById('diagHddState').value = pc.hddState;
            document.getElementById('diagHddType').value = pc.hddType;
            document.getElementById('diagRamState').value = pc.ramState;
            document.getElementById('diagRamType').value = pc.ramType;
            document.getElementById('diagBattery').value = pc.battery;
            document.getElementById('diagKeyboard').value = pc.keyboard;
            document.getElementById('repairable').value = pc.repairable;
            document.getElementById('purchasePrice').value = pc.purchasePrice;
            document.getElementById('sellingPrice').value = pc.sellingPrice;

            if (pc.parts && pc.parts.length > 0) {
                pc.parts.forEach(p => addPartRow(p.name, p.cost));
            }
        } else {
            document.getElementById('modalTitle').innerText = "Créer une Fiche Suivi PC";
            document.getElementById('pcId').value = '';
            document.getElementById('trackingNum').value = generateTrackingNumber();
            document.getElementById('pcModel').value = '';
            document.getElementById('pcStatus').value = 'En attente';
            document.getElementById('purchasePrice').value = '0';
            document.getElementById('sellingPrice').value = '0';
            document.getElementById('diagCharger').value = 'Présent';
            document.getElementById('diagHddState').value = 'Présent';
            document.getElementById('diagHddType').value = '';
            document.getElementById('diagRamState').value = 'Présente';
            document.getElementById('diagRamType').value = '';
            document.getElementById('diagBattery').value = 'Présente (OK)';
            document.getElementById('diagKeyboard').value = 'Présent (OK)';
            
            // Vérification initiale pièces automatiques
            checkMissingPartsAutomatic();
        }
        calculateFinancials();
    }

    function addPartRow(name = '', cost = 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="part-name" value="${name}" placeholder="Nom de la pièce (ex: SSD 500Go)"></td>
            <td><input type="number" step="0.01" class="part-cost" value="${cost}" placeholder="0.00"></td>
            <td><button type="button" class="btn danger remove-part" style="padding: 5px 10px;">X</button></td>
        `;
        tr.querySelector('.remove-part').addEventListener('click', () => {
            tr.remove();
            calculateFinancials();
        });
        tr.querySelectorAll('input').forEach(input => input.addEventListener('input', calculateFinancials));
        partsTableBody.appendChild(tr);
        calculateFinancials();
    }

    // Automatisation : si un élément est absent ou HS, l'ajouter dans les pièces à acheter
    function checkMissingPartsAutomatic() {
        // Cette fonction peut être personnalisée pour injecter automatiquement des lignes si besoin
        calculateFinancials();
    }

    function getPartsList() {
        const parts = [];
        partsTableBody.querySelectorAll('tr').forEach(tr => {
            const name = tr.querySelector('.part-name').value;
            const cost = parseFloat(tr.querySelector('.part-cost').value) || 0;
            if (name.trim() !== '') {
                parts.push({ name, cost });
            }
        });
        return parts;
    }

    function calculateFinancials() {
        const purchase = parseFloat(document.getElementById('purchasePrice').value) || 0;
        const selling = parseFloat(document.getElementById('sellingPrice').value) || 0;
        
        let partsTotal = 0;
        document.querySelectorAll('.part-cost').forEach(input => {
            partsTotal += parseFloat(input.value) || 0;
        });

        const totalCost = purchase + partsTotal;
        const profit = selling - totalCost;

        document.getElementById('summaryPartsCost').innerText = partsTotal.toFixed(2);
        document.getElementById('summaryTotalCost').innerText = totalCost.toFixed(2);
        
        const profitEl = document.getElementById('summaryProfit');
        profitEl.innerText = profit.toFixed(2);
        profitEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    function savePCData(e) {
        e.preventDefault();
        const id = document.getElementById('pcId').value;
        const purchasePrice = parseFloat(document.getElementById('purchasePrice').value) || 0;
        const sellingPrice = parseFloat(document.getElementById('sellingPrice').value) || 0;
        
        let partsTotal = 0;
        getPartsList().forEach(p => partsTotal += p.cost);
        const totalCost = purchasePrice + partsTotal;
        const profit = sellingPrice - totalCost;

        const pcData = {
            id: id ? parseInt(id) : Date.now(),
            trackingNum: document.getElementById('trackingNum').value,
            model: document.getElementById('pcModel').value,
            status: document.getElementById('pcStatus').value,
            date: id ? pcList.find(p => p.id == id).date : new Date().toLocaleDateString(),
            charger: document.getElementById('diagCharger').value,
            hddState: document.getElementById('diagHddState').value,
            hddType: document.getElementById('diagHddType').value,
            ramState: document.getElementById('diagRamState').value,
            ramType: document.getElementById('diagRamType').value,
            battery: document.getElementById('diagBattery').value,
            keyboard: document.getElementById('diagKeyboard').value,
            repairable: document.getElementById('repairable').value,
            purchasePrice,
            sellingPrice,
            parts: getPartsList(),
            totalCost,
            profit
        };

        if (id) {
            const index = pcList.findIndex(p => p.id == id);
            if (index !== -1) pcList[index] = pcData;
        } else {
            pcList.push(pcData);
        }

        localStorage.setItem('pc_atelier_list', JSON.stringify(pcList));
        modal.style.display = 'none';
        renderTable();
    }

    function renderTable() {
        const query = searchInput.value.toLowerCase();
        pcTableBody.innerHTML = '';

        const filtered = pcList.filter(pc => 
            pc.trackingNum.toLowerCase().includes(query) || 
            pc.model.toLowerCase().includes(query) ||
            pc.status.toLowerCase().includes(query)
        );

        if (filtered.length === 0) {
            pcTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b;">Aucun PC trouvé.</td></tr>`;
            return;
        }

        filtered.forEach(pc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${pc.trackingNum}</strong></td>
                <td>${pc.model}</td>
                <td><span class="badge status-${pc.status.replace(/\s+/g, '')}">${pc.status}</span></td>
                <td>${pc.purchasePrice.toFixed(2)} €</td>
                <td>${(pc.totalCost - pc.purchasePrice).toFixed(2)} €</td>
                <td>${pc.sellingPrice.toFixed(2)} €</td>
                <td style="font-weight: bold; color: ${pc.profit >= 0 ? 'var(--success)' : 'var(--danger)'};">${pc.profit.toFixed(2)} €</td>
                <td>
                    <button class="btn primary btn-sm edit-btn" style="padding: 5px 10px; font-size: 0.8rem;">Éditer</button>
                    <button class="btn danger btn-sm delete-btn" style="padding: 5px 10px; font-size: 0.8rem;">Suppr</button>
                </td>
            `;

            tr.querySelector('.edit-btn').addEventListener('click', () => openModal(pc));
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm(`Voulez-vous supprimer le suivi ${pc.trackingNum} ?`)) {
                    pcList = pcList.filter(p => p.id !== pc.id);
                    localStorage.setItem('pc_atelier_list', JSON.stringify(pcList));
                    renderTable();
                }
            });

            pcTableBody.appendChild(tr);
        });
    }

    function populatePrintArea() {
        document.getElementById('printTrackingNum').innerText = document.getElementById('trackingNum').value;
        document.getElementById('printModel').innerText = document.getElementById('pcModel').value || '-';
        document.getElementById('printDate').innerText = new Date().toLocaleDateString();
        document.getElementById('printStatus').innerText = document.getElementById('pcStatus').value;
        document.getElementById('printPurchasePrice').innerText = document.getElementById('purchasePrice').value;
        
        document.getElementById('printCharger').innerText = document.getElementById('diagCharger').value;
        document.getElementById('printHdd').innerText = `${document.getElementById('diagHddState').value} - ${document.getElementById('diagHddType').value}`;
        document.getElementById('printRam').innerText = `${document.getElementById('diagRamState').value} - ${document.getElementById('diagRamType').value}`;
        document.getElementById('printBattery').innerText = document.getElementById('diagBattery').value;
        document.getElementById('printKeyboard').innerText = document.getElementById('diagKeyboard').value;

        const printPartsBody = document.getElementById('printPartsBody');
        printPartsBody.innerHTML = '';
        const parts = getPartsList();
        if (parts.length === 0) {
            printPartsBody.innerHTML = `<tr><td colspan="2" style="text-align: center;">Aucune pièce particulière requise.</td></tr>`;
        } else {
            parts.forEach(p => {
                printPartsBody.innerHTML += `<tr><td>${p.name}</td><td>${p.cost.toFixed(2)} €</td></tr>`;
            });
        }

        document.getElementById('printTotalCost').innerText = document.getElementById('summaryTotalCost').innerText;
        document.getElementById('printSellingPrice').innerText = document.getElementById('sellingPrice').value;
        document.getElementById('printProfit').innerText = document.getElementById('summaryProfit').innerText;
    }

    function syncWithGoogleDriveSimulation() {
        // Crée un fichier de sauvegarde JSON téléchargeable directement vers votre dossier Google Drive synchronisé sur PC
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pcList, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `sauvegarde_suivi_pcs_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        alert("Fichier de sauvegarde généré ! En l'enregistrant dans votre dossier Google Drive synchronisé, vos données seront sauvegardées sur le Cloud.");
    }
});