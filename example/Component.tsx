import * as React from "react";
import { GridColumn } from "../lib/VirtualizedGrid";
import { RepoInfoFragment as RepoInfo } from "./types";
import ApolloVirtualizedGrid, { ApolloListResult } from "../lib";
import query from "./graphql";

class TApolloVirtualizedGrid extends ApolloVirtualizedGrid<RepoInfo> {}

type Props = {};

type State = {
  columns: ReadonlyArray<GridColumn<RepoInfo>>;
  variables: {
    first: number;
    after?: string;
  };
  selected:number[];
};

class Component extends React.Component<Props, State> {
  state: State = {
    selected:[],
    columns: [
      {
        label: "Name",
        key: "nameWithOwner",
        sortable:true,
        width: 200
      },
      {
        label: "Description",
        key: "description",
        width: 200,
        flexGrow: 1,
        sortable:true
      },
      {
        label: "Fork",
        key: "forkCount",
        width: 100,
        textAlign: "right",
        labelAlign: "right"
      },
      {
        label: "Owner",
        key: "owner/id",
        width: 150,
        format: ({ key, rowData }) => {
          return rowData.owner.login;
        }
      }
    ],
    variables: {
      first: 20
    }
  };
  render() {
    const { columns, variables , selected} = this.state;
    return (
      <TApolloVirtualizedGrid
      selectedItems={selected}
        graphqlQuery={query}
        columns={columns}
        variables={variables}
        onRowClick={(data, index) => {
          this.setState({selected:[index]});
          window.location.href = `https://github.com/${data.nameWithOwner}`;
        }}
        pageSize={variables.first}
        listItemHeight={82}
        listModeBreakPoint={0}
        parseListFromQueryResult={queryResult => {
          const { search } = queryResult;
          if (!search) {
            return null;
          }
          const {
            repositoryCount,
            pageInfo: { hasNextPage, endCursor },
            nodes
          } = search;
          const result: ApolloListResult<RepoInfo> = {
            pageInfo: {
              hasNextPage,
              endCursor,
              rowCount:repositoryCount
            },
            edges: nodes
          };
          return result;
        }}
        updateQuery={(previousResult, newList) => {
          const {
            pageInfo: { hasNextPage,rowCount, endCursor },
            edges
          } = newList;
          return {
            ...previousResult,
            search: {
              ...previousResult.search,
              repositoryCount: rowCount,
              pageInfo: {
                ...previousResult.search.pageInfo,
                hasNextPage,
                endCursor
              },
              nodes: edges
            }
          };
        }}
        onColumnPropsChanged={(columns, orderBy)=>{
          this.setState({columns});
          console.log(orderBy);
        }}
        onLoadMore={pageInfo => {
          return { ...variables, after: pageInfo.after };
        }}
      />
    );
  }
}

export default Component;
