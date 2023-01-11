import { gql } from '@apollo/client';

export const CREATE_STEP = gql`
  mutation CreateStep($input: CreateStepInput) {
    createStep(input: $input) {
      id
      type
      key
      appKey
      parameters
      position
      status
      connection {
        id
      }
    }
  }
`;
