function _ajax(url, method, data) {
    return new Promise((resolve, reject) => {
        kit.send({
            url: url,
            method: method,
            data,
            success: (respuesta) => {
                resolve(respuesta);
            },
            error: (codigo, respuesta) => {
                reject({ codigo, respuesta });
            }
        });
    });
}

function _search(array, obj, value) {
    const resultados = array.filter((elemento) => {
        return elemento[obj] === value;
    });
    return resultados;
}

function hexToBase64(hex) {
    // Convierte datos hexadecimales en una cadena Base64
    const raw = atob(hex.replace(/[0-9a-fA-F]/g, (match) => {
        return String.fromCharCode(parseInt(match, 16));
    }));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
        result += String.fromCharCode(raw.charCodeAt(i));
    }
    return btoa(result);
}

async function save(elm, name) {
    elm.classList.add("disabled");
    const res = await _ajax("/save-img", "POST", { name: name });
    if (res) {
        elm.classList.remove("disabled");
    } else {
        M.toast({ html: `No fue posible guardar la imagen` });
        elm.classList.remove("disabled");
    }
}


kit.onDOMReady(async () => {
    // Menu Left
    kit.addEvent('.open-menu-left', 'click', (e) => {

        kit.qsSelector(false, e.target.dataset.menu, (e) => {
            const veryClass = kit.hasClass(".menu-left", "menu-left-active");

            if (!veryClass) {
                e.style.left = 0;
                e.classList.add("menu-left-active");
            } else {
                e.style.left = -e.offsetWidth + "px";
                e.classList.remove("menu-left-active");
            }

        });

    });

    kit.addEvent('.menu-left', 'click', (e) => {
        const menu = e.currentTarget;
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        const menuRect = menu.getBoundingClientRect();

        const clickX = e.clientX - menuRect.left;
        const clickY = e.clientY - menuRect.top;

        if (clickX >= 0 && clickX <= menuWidth && clickY >= 0 && clickY <= menuHeight) {
        } else {
            menu.classList.remove('menu-left-active');
            menu.style.left = -menuWidth + "px";
        }
    });

    // menu compress
    const localPage = window.location.pathname.slice(1).split("/").filter(Boolean);
    if (localPage.length == 0) {
        kit.qsSelector("all", "[href='/']", (result) => {
            for (const navegate of result) {
                navegate.classList.add("active-item");
            }
        })
    } else {

        if (localPage.includes("cog") == true) {
            kit.qsSelector("all", "[href='/cog']", (result) => {
                for (const navegate of result) {
                    navegate.classList.add("active-item");
                }
            })
        } else if (localPage.includes("results") == true) {
            kit.qsSelector("all", "[href='/results']", (result) => {
                for (const navegate of result) {
                    navegate.classList.add("active-item");
                }
            })
        }

    }


    kit.fileDropZone("#dropzone", (files) => {
        const filesArray = Array.from(files);
        let extension = [".jpg", ".png"];
        const img_list = kit.qsSelector(false, "#list-imgs");
        img_list.innerHTML = "";
        if (filesArray.length > 0) {

            // ocultar icono
            kit.hide(".icon-add-drag-drop", 300);

            for (const file of filesArray) {
                if (extension.includes(kit.extname(file.path))) {
                    // add array
                    me.save.unshift({
                        name: file.name,
                        path: file.path,
                        extension: kit.extname(file.path),
                        size: file.size || 0,
                    });
                    // add dom
                    const getNames = file.name.slice(0, (file.name.length - kit.extname(file.path).length));
                    
                    img_list.innerHTML += `<div class="app-col">
                                                <div class="img-select z-depth-2" style="background-image: url(/file/${btoa(encodeURI(file.path))});">
                                                    <div class="progress-img progress--${getNames}"></div>
                                                </div>
                                                <div class="title-all">
                                                    ${kit.dirname(file.path)}
                                                </div>
                                            </div>`;
                } else {
                    M.toast({ html: `Extension not allowed (${kit.extname(file.path)})` });
                }
            }

            kit.qsSelector(false, ".send-img", (send) => {
                send.classList.remove("disabled");
            })
        } else {
            kit.show(".icon-add-drag-drop", 300);
        }
    });

    kit.onClick("send-img", async (send) => {
        kit.qsSelector(false, ".send-img", (send) => {
            send.classList.remove("disabled");
        })

        let list = me.save;
        let total = parseInt(0);

        for (const lit of list) {
            const getNames = lit.name.slice(0, (lit.name.length - kit.extname(lit.path).length));
            let newName = getNames;
            newName = cacheapp.newProgressBar(getNames, `.progress--${getNames}`, "Line", {
                color: '#f57c00',
                strokeWidth: 2,
                trailWidth: 3,
                trailColor: '#212121 ',
            });

            newName.animate(0.50, {
                duration: 1500,
            }, async () => {
                const res = await _ajax("/upload-to-db", "POST", lit);
                if (res) {
                    newName.animate(1, {
                        duration: 1500,
                    }, async () => {
                        newName.destroy();
                        cacheapp.newProgressBar("delete", getNames);
                    });

                    ++total;
                } else {
                    M.toast({ html: `Fallo (${lit.name})` });
                }

            })

        }

        if (list.length == total) {
            M.toast({ html: `Completo.` });
        } else {
            kit.qsSelector(false, ".send-img", (send) => {
                send.classList.remove("disabled");
            })
        }

    })

    kit.onElementChange("#form-level", async (form) => {
        const value = form.querySelector("input").value;
        await _ajax("/save-cog", "POST", {level: parseInt(value)});

    }, "change");

    kit.onElementChange("#form-save-in", async (form) => {
        const value = form.querySelector("select").value;
        await _ajax("/save-cog", "POST", {db: value});

    }, "change");

    kit.existsElm(".page-result", async () => {

        const res = await _ajax("/results-img", "POST", {});
        if (res) {
            kit.hide(".container-loading", 200);

            // show Imgs
            $('#pagination-imgs').pagination({
                dataSource: res,
                pageSize: 15,
                callback: function (data, pagination) {
                    renderPageData(data);
                }
            });
        }
    })



});

async function renderPageData(data) {
    const dataContainer = document.getElementById('list-imgs');
    dataContainer.innerHTML = '';
    // hexToBase64(item.imageblob)
    for (const item of data) {
        const imageBytes = item.imageblob;
        dataContainer.innerHTML += `<div class="app-col">
                                        <div class="img-select z-depth-2" style="background-image: url('data:image/jpeg;base64,${imageBytes}');">
                                            <div class="btn-action">
                                                <div class="img-action save-img icon-download4 z-depth-1" onclick="save(this, '${item.name}')"></div>
                                            </div>
                                        </div>
                                        <div class="title-all">
                                            ${item.name}
                                        </div>
                                    </div>`;
    }
}