import React, { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons"


export const Search = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const [searchTerm, setSearchTerm] = useState(searchParams.get("find") || "")

	const search = (event: React.SubmitEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (searchTerm.trim() !== "") {
			const newParams = new URLSearchParams(searchParams)
			newParams.set("find", searchTerm)
			setSearchParams(newParams)
		} else {
			setSearchParams({})
		}
	}

	const reset = (event: React.SubmitEvent<HTMLFormElement>) => {
		event.preventDefault()
		setSearchTerm("")
		setSearchParams({})
	}

	return (
		<form onSubmit={e => search(e)} onReset={reset} className="join">
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