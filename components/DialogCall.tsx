import Image from "next/image"
import Carregando from "../app/assets/icons/carregando.png"

function Dialog({ setModal }) {
  function closeModal() {
    setModal(false)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="bg-white grid sm:grid-rows-1 sm:w-auto rounded-md border-2 border-gray-200 h-36 w-60">
      <div className="flex flex-col items-center mt-5">
          <span className="text-gray-400 sm:ml-10 sm:mr-10 text-lg bg-white sm:p-2">
            Reconectando...
          </span>
          <div className="flex justify-center">
          <Image src={Carregando} alt="Descrição da imagem" className="w-20 h-14 mt-2"></Image>
          </div>
        </div>
        <div className="grid grid-cols-1 mb-5 mt-20">
          <div className="flex justify-center"></div>
        </div>
      </div>
    </div>
  )
}

export default Dialog
