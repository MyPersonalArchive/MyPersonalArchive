import { useState, FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons"


export const Search = () => {
	const [searchTerm, setSearchTerm] = useState("")
	const [_, setSearchParams] = useSearchParams()

	const search = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (searchTerm.trim() !== "") {
			setSearchParams(p => {
				const newParams = new URLSearchParams(p)
				newParams.set("find", searchTerm)
				return newParams
			})
		} else {
			setSearchParams({})
		}
	}

	const reset = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setSearchTerm("")
		setSearchParams({})
	}

	return (
		<form onSubmit={search} onReset={reset} className="join">
			<input className="input"
				type="text"
				placeholder="Search for anything"
				value={searchTerm}
				onChange={e => setSearchTerm(e.target.value)}
			/>
			<button type="reset" className="btn btn-primary">
				<FontAwesomeIcon icon={faXmark} className="mr-1" />
			</button>
			<button type="submit" className="btn btn-primary">
				<FontAwesomeIcon icon={faMagnifyingGlass} className="mr-1" />
			</button>
		</form>
	)
}