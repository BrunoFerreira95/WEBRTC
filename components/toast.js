// Função para criar um toast
function createToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-5 right-5 mb-4 p-4 rounded-lg shadow-lg text-white transition-opacity duration-300 ease-in-out ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`;
  
    toast.textContent = message;
  
    document.body.appendChild(toast);
  
    // Remover o toast após 3 segundos
    setTimeout(() => {
      toast.classList.add("opacity-0");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  
  // Exporta a função para uso em outros arquivos
  export default createToast;