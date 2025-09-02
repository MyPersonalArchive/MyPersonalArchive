import { useRef } from "react"


type StickyHeaderProps = {
    goesAway: React.ReactNode
    alwaysVisible: React.ReactNode
    className?: string
}
export const StickyHeader = ({ goesAway, alwaysVisible, className }: StickyHeaderProps) => {
    const headerRef = useRef<HTMLHeadElement>(null)
    const alwaysVisibleRef = useRef<HTMLDivElement>(null)

    const animateOnScroll = () => {
        if (!headerRef.current || !alwaysVisibleRef.current) return

        // Get scroll positions
        const scrollTop = Math.max(0, window.pageYOffset || document.documentElement.scrollTop)
        const scrollBottom = Math.max(0, document.documentElement.scrollHeight - (scrollTop + window.innerHeight))

        // Animate the header
        const alwaysVisibleStyles = window.getComputedStyle(alwaysVisibleRef.current!)
        const alwaysVisibleHeight = parseFloat(alwaysVisibleStyles.marginTop) + parseFloat(alwaysVisibleStyles.marginBottom) + alwaysVisibleRef.current!.offsetHeight
        const fullHeight = headerRef.current!.offsetHeight
        const translateY = Math.min(scrollTop, fullHeight - alwaysVisibleHeight)
        headerRef.current!.style.transform = `translateY(-${translateY}px)`
    }

    animateOnScroll()

    document.addEventListener("scroll", animateOnScroll)
    window.addEventListener("resize", animateOnScroll)

    return (
        <>
            <header
                ref={headerRef}
                style={{ position: "sticky", top: 0 }}
                className={className}>
                <div>
                    {goesAway}
                </div>
                <div ref={alwaysVisibleRef}>
                    {alwaysVisible}
                </div>
            </header>
        </>
    )
}


type StickyFooterProps = {
    goesAway: React.ReactNode
    alwaysVisible: React.ReactNode
    className?: string
}
export const StickyFooter = ({ goesAway, alwaysVisible, className }: StickyFooterProps) => {
    const footerRef = useRef<HTMLHeadElement>(null)
    const alwaysVisibleRef = useRef<HTMLDivElement>(null)

    const animateOnScroll = () => {
        if (!footerRef.current || !alwaysVisibleRef.current) return

        // Get scroll positions
        const scrollTop = Math.max(0, window.pageYOffset || document.documentElement.scrollTop)
        const scrollBottom = Math.max(0, document.documentElement.scrollHeight - (scrollTop + window.innerHeight))

        // Animate the header
        const alwaysVisibleStyles = window.getComputedStyle(alwaysVisibleRef.current!)
        const alwaysVisibleHeight = parseFloat(alwaysVisibleStyles.marginTop) + parseFloat(alwaysVisibleStyles.marginBottom) + alwaysVisibleRef.current!.offsetHeight
        const fullHeight = footerRef.current!.offsetHeight
        const translateY = Math.min(scrollBottom, fullHeight - alwaysVisibleHeight)
        footerRef.current!.style.transform = `translateY(${translateY}px)`

    }

    animateOnScroll()

    document.addEventListener("scroll", animateOnScroll)
    window.addEventListener("resize", animateOnScroll)

    return (
        <>
            <footer
                ref={footerRef}
                style={{ position: "sticky", bottom: 0 }}
                className={className}>
                <div ref={alwaysVisibleRef}>
                    {alwaysVisible}
                </div>
                <div>
                    {goesAway}
                </div>
            </footer>
        </>
    )
}
