export interface Address {
  _id?: string;
  userId: string;
  label: string;
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressRequest {
  label: string;
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  _id: string;
}
