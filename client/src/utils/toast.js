import toast from 'react-hot-toast'

const darkStyle = {
  background: '#13161d',
  color: '#e8eaf0',
  border: '1px solid rgba(108, 99, 255, 0.3)',
}

export function toastSuccess(msg) {
  toast.success(msg, {
    style: { ...darkStyle, borderColor: 'rgba(52, 211, 153, 0.4)' },
    iconTheme: { primary: '#34d399', secondary: '#0d0f14' },
  })
}

export function toastError(msg) {
  toast.error(msg || 'Something went wrong', {
    style: { ...darkStyle, borderColor: 'rgba(244, 63, 94, 0.5)' },
    iconTheme: { primary: '#f43f5e', secondary: '#0d0f14' },
  })
}

export function toastLoading(msg) {
  return toast.loading(msg, { style: darkStyle })
}

export function toastDismiss(id) {
  toast.dismiss(id)
}

export { toast }
