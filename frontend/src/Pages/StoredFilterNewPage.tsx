import { useAtomValue } from "jotai"
import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { TagsInput } from "../Components/TagsInput"
import { RoutePaths } from "../RoutePaths"
import { tagsAtom } from "../Utils/Atoms"
import { useApiClient } from "../Utils/useApiClient"


export const StoredFilterNewPage = () => {

	const [name, setName] = useState<string>("")
	const [title, setTitle] = useState<string>("")
	const [tags, setTags] = useState<string[]>([])
	const [selectedMetadataTypes, setSelectedMetadataTypes] = useState<Set<string>>(new Set<string>())

	const allTags = useAtomValue(tagsAtom)

	const params = useParams()
	const navigate = useNavigate()
	const apiClient = useApiClient()


	const save = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		apiClient.post("/api/execute/CreateStoredFilter", {
			name,
			filterDefinition: {
				title,
				tags,
				metadataTypes: Array.from(selectedMetadataTypes),
			}
		})

		navigate(RoutePaths.StoredFilters)
	}

	return (
		<>
			<form onSubmit={save}>
				<h1 className="heading-1">
					New filter
				</h1>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="name">Filter name</label>
					<input type="text"
						className="input"
						id="name" placeholder="" autoFocus required data-1p-ignore
						value={name}
						onChange={event => setName(event.target.value)}
					/>
				</div>

				<b>Filter definition</b>
				<div className="aligned-labels-and-inputs">
					<label htmlFor="title">Title</label>
					<input type="text"
						className="input"
						id="title" placeholder="" autoFocus required data-1p-ignore
						value={title}
						onChange={event => setTitle(event.target.value)}
					/>
				</div>


				<div className="aligned-labels-and-inputs">
					<label htmlFor="tags">Tags</label>
					<TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={allTags} />
				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="metadataTypes">Metadata types</label>
					<div className="flex flex-row gap-2">
						{
							allMetadataTypes.filter(({ path }) => typeof path === "string")
								.map(({ displayName, path }) => (
									<label key={displayName} >
										<input
											type="checkbox"
											id={displayName}
											checked={selectedMetadataTypes.has(path as string)}
											onChange={() => {
												if (selectedMetadataTypes.has(path as string))
													selectedMetadataTypes.delete(path as string)
												else
													selectedMetadataTypes.add(path as string)

												setSelectedMetadataTypes(new Set(selectedMetadataTypes))
											}}
										/>
										{displayName}
									</label>
								))
						}
					</div>
				</div>

				<div className="stack-horizontal to-the-right my-4">
					<Link className="link align-with-btn" to={-1 as any}>
						Back
					</Link>
					<button className="btn btn-primary" type="submit">
						Save
					</button>
				</div>
			</form >
		</>
	)
}
