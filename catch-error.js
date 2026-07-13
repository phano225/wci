window.addEventListener("error", function(e) {
  document.body.innerHTML += `<div style="position:absolute;z-index:9999;background:red;color:white;padding:20px;top:0;left:0;">ERROR: ${e.message}</div>`;
});
