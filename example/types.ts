/* tslint:disable */
//  This file was automatically generated and should not be edited.

export interface SearchQueryVariables {
  first?: number | null,
  after?: string | null,
};

export interface SearchQuery {
  // Perform a search across resources.
  search:  {
    __typename: "SearchResultItemConnection",
    // The number of repositories that matched the search query.
    repositoryCount: number,
    // Information to aid in pagination.
    pageInfo:  {
      __typename: "PageInfo",
      // When paginating forwards, are there more items?
      hasNextPage: boolean,
      // When paginating forwards, the cursor to continue.
      endCursor: string | null,
    },
    // A list of nodes.
    nodes:  Array<( {
        __typename: "Issue",
      } | {
        __typename: "PullRequest",
      } | {
        __typename: "Repository",
        // The repository's name with owner.
        nameWithOwner: string,
        // The description of the repository.
        description: string | null,
        // Returns how many forks there are of this repository in the whole network.
        forkCount: number,
        // The User owner of the repository.
        owner: ( {
            __typename: "Organization",
            id: string,
            // The username used to login.
            login: string,
          } | {
            __typename: "User",
            id: string,
            // The username used to login.
            login: string,
          }
        ),
      } | {
        __typename: "User",
      } | {
        __typename: "Organization",
      } | {
        __typename: "MarketplaceListing",
      }
    ) | null > | null,
  },
};

export type RepoInfoFragment = ( {
      __typename: "Repository",
      // The repository's name with owner.
      nameWithOwner: string,
      // The description of the repository.
      description: string | null,
      // Returns how many forks there are of this repository in the whole network.
      forkCount: number,
      // The User owner of the repository.
      owner: ( {
          __typename: "Organization",
          id: string,
          // The username used to login.
          login: string,
        } | {
          __typename: "User",
          id: string,
          // The username used to login.
          login: string,
        }
      ),
    }
  );
