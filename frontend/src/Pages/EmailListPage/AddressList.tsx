import { EmailAddress } from "../../Utils/Atoms/EmailAtoms"


type Props = {
	addresses: EmailAddress[]
}
export const AddressList = ({ addresses }: Props) => {
	return (
		<>
			{addresses.map((address, ix) => (
				<span key={ix}>
					<Address address={address} />
					{ix < addresses.length - 1 && "; "}
				</span>
			))}
		</>
	)
}


type AddressProps = {
	address: EmailAddress
}
const Address = ({ address }: AddressProps) => {
	return <span title={address.emailAddress}>{address.name ?? address.emailAddress}</span>
}

