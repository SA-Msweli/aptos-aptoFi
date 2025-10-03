import { CONTRACT_ADDRESSES } from "@/lib/constants";

export type CreateProfileArguments = {
  profileHash: string;
  metadataKeys: string[];
  metadataValues: string[];
};

export const createProfile = (args: CreateProfileArguments) => {
  const { profileHash, metadataKeys, metadataValues } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.DID_REGISTRY}::create_profile`,
      functionArguments: [profileHash, metadataKeys, metadataValues],
    },
  };
};

export type UpdateProfileArguments = {
  profileHash: string;
  metadataKeys: string[];
  metadataValues: string[];
};

export const updateProfile = (args: UpdateProfileArguments) => {
  const { profileHash, metadataKeys, metadataValues } = args;
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.DID_REGISTRY}::update_profile`,
      functionArguments: [profileHash, metadataKeys, metadataValues],
    },
  };
};

export type DeactivateProfileArguments = {};

export const deactivateProfile = (args: DeactivateProfileArguments) => {
  return {
    data: {
      function: `${CONTRACT_ADDRESSES.DID_REGISTRY}::deactivate_profile`,
      functionArguments: [],
    },
  };
};