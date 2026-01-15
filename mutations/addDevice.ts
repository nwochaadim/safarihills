import { gql } from '@apollo/client';

export const ADD_DEVICE = gql`
  mutation AddDevice(
    $pushToken: String!
    $brand: String
    $manufacturer: String
    $model: String
    $osName: String
    $osVersion: String
    $deviceType: Int
  ) {
    addDevice(
      input: {
        pushToken: $pushToken
        brand: $brand
        manufacturer: $manufacturer
        model: $model
        osName: $osName
        osVersion: $osVersion
        deviceType: $deviceType
      }
    ) {
      id
    }
  }
`;
