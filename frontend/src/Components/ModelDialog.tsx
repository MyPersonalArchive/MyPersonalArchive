import { ReactNode } from "react"

type ModalDialogProps = {
    children: ReactNode
    onClose: () => void
}

export const ModalDialog = ({ onClose, children }: ModalDialogProps) => {
    return (
        <div>
            <div className="dialog-backdrop" onClick={onClose}></div>
            <div className="dialog">
                <button className="dialog-close" onClick={onClose}>
          X
                </button>
                {children}
            </div>
        </div>
    )
}

type DialogChildrenProps = {
    children: ReactNode;
}

export const DialogFooter = ({ children }: DialogChildrenProps) => {
    return <div className="dialog-footer">{children}</div>
}

export const DialogHeader = ({ children }: DialogChildrenProps) => {
    return <div className="dialog-header">{children}</div>
}

export const DialogContent = ({ children }: DialogChildrenProps) => {
    return <div className="dialog-content">{children}</div>
}