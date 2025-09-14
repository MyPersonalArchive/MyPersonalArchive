import { useEffect, useRef } from "react"


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

    //TODO: share the mutationobserver instance and code between header and footer
    //TODO: Remember scrollposition of top bar when navigating to other page(s). If part of header is hidden, keep it hidden
    useEffect(() => {
        // Observe only changes inside the <main> element
        const mainElement = document.querySelector("main")
        var observer: MutationObserver | undefined = undefined
        if (mainElement) {
            observer = new MutationObserver(() => {
                animateOnScroll()
            })
            observer.observe(mainElement, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            })
        }

        return () => {
            document.removeEventListener("scroll", animateOnScroll)
            window.removeEventListener("resize", animateOnScroll)
            observer?.disconnect()
        }
    }, [])

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

        // Reset footer margin top before calculating anything for the footer
        footerRef.current!.style.marginTop = `0px`

        // Get scroll positions
        const scrollTop = Math.max(0, window.pageYOffset || document.documentElement.scrollTop)
        const scrollBottom = Math.max(0, document.documentElement.scrollHeight - (scrollTop + window.innerHeight))

        // Animate the footer
        const alwaysVisibleStyles = window.getComputedStyle(alwaysVisibleRef.current!)
        const alwaysVisibleHeight = parseFloat(alwaysVisibleStyles.marginTop) + parseFloat(alwaysVisibleStyles.marginBottom) + alwaysVisibleRef.current!.offsetHeight
        const fullHeight = footerRef.current!.offsetHeight
        const translateY = Math.min(scrollBottom, fullHeight - alwaysVisibleHeight)

        footerRef.current!.style.transform = `translateY(${translateY}px)`

        const bottomOfElementBeforeFooter = footerRef.current!.previousElementSibling?.getBoundingClientRect()?.bottom ?? 0
        const marginTop = Math.max(0, window.innerHeight - (bottomOfElementBeforeFooter + scrollTop) - fullHeight)
        footerRef.current!.style.marginTop = `${marginTop}px`
    }

    animateOnScroll()

    document.addEventListener("scroll", animateOnScroll)
    window.addEventListener("resize", animateOnScroll)

    useEffect(() => {
        const mainElement = document.querySelector("main")
        var observer: MutationObserver | undefined = undefined
        if (mainElement) {
            observer = new MutationObserver(() => {
                animateOnScroll()
            })
            observer.observe(mainElement, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            })
        }

        return () => {
            document.removeEventListener("scroll", animateOnScroll)
            window.removeEventListener("resize", animateOnScroll)
            observer?.disconnect()
        }
    }, [])

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
