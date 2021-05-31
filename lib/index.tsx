import * as React from "react";
import VirtualizedGrid, {
  SearchMode,
  VirtualizedGridProps,
  GridColumn,
  CheckBoxColumnMode,
} from "./VirtualizedGrid";
import { Query } from "@apollo/client/react/components";
import  { ApolloClient, ApolloQueryResult  } from "@apollo/client";
import range from "lodash/range";

export type PageInfo = {
  currentPage: number|null;
  hasNextPage: boolean | null;
  hasPreviousPage:boolean | null;
  pageCount:number|null;
  pageSize:number|null;
  endCursor?: string|null;
  rowCount: number|null;
};

const DefaultPageInfoValue :PageInfo = {
  currentPage:null,
  hasNextPage:false,
  hasPreviousPage:false,
  pageCount:0,
  pageSize:0,
  endCursor:null,
  rowCount:0
};


export interface ApolloListResult<T> {
  edges: T[];
  pageInfo: PageInfo;
}

export interface ListItemRenderProps<T> {
  rowData: T;
  key: string;
  style: React.CSSProperties;
  index: number;
  className: string;
  onClick: () => void;
  selected: boolean;
}

interface Props<T> {
  refetchRequestCounter?:number;
  columns: ReadonlyArray<GridColumn<T>>;
  pageSize?: number;
  graphqlQuery: any;
  variables: any;
  listPropsName?: string;
  parseListFromQueryResult?: (queryResult: any) => ApolloListResult<T>;
  onColumnPropsChanged?: (
    columns: ReadonlyArray<GridColumn<T>>,
    orderBy: string[]
  ) => void;
  onRowClick?: (rowData: T, index: number) => void;
  listItemHeight?: number;
  listModeBreakPoint?: number;
  listItemRenderer?: (renderProps: ListItemRenderProps<T>) => JSX.Element;
  selectedItems: ReadonlyArray<number>;
  updateQuery?: (previousResult: any, list: ApolloListResult<T>) => any;
  scrollToIndex?: number;
  onDataFetched?: (data: any) => void;
  tableClassName?: string;
  listClassName?: string;
  rootClassName?: string;
  headerComponent?: React.ReactNode;
  checkBoxColumnMode?: CheckBoxColumnMode;
  setSelectedItems?: (items: number[]) => void;
  selectedAll?: boolean;
  setSelectedAll?: (items: number[]) => void;
  clearSelectedAll?: () => void;
  displayRowCount?: boolean;
  debugname?: string;
  onLoadMore: (pagination: {
    page: number;
    pageSize: number;
    after: string;
  }) => any;
  apolloClient?: ApolloClient<object>;
}

type State = {
  scrollToIndex: number;
};

class ApolloVirtualizedGrid<T> extends React.Component<Props<T>> {
  refetchQuery:(variables?:any)=>Promise<ApolloQueryResult<any>> = null;
  static defaultProps: any = {
    pageSize: 20,
    listPropsName: "list",
    displayRowCount: true,
    refetchRequestCounter:1
  };
  state: State = {
    scrollToIndex: -1,
  };
  lastFatchedData: any = null;
  loaderCacheResetor: () => void;
  componentDidMount() {
    const { scrollToIndex } = this.props;
    this.setState({ scrollToIndex });
  }
  // componentWillReceiveProps({ variables, scrollToIndex }: Props<T>) {
  //   if (variables !== this.props.variables) {
  //     this.setState({ scrollToIndex: -1 });
  //     if (this.loaderCacheResetor) {
  //       this.loaderCacheResetor();
  //     }
  //   }
  //   if (scrollToIndex !== this.state.scrollToIndex) {
  //     this.setState({ scrollToIndex });
  //   }
  // }

  static getDerivedStateFromProps<T>(props: Props<T>, state: State) {
    const newState = { ...state };
    if (props.scrollToIndex == null) newState.scrollToIndex = -1;
    else if (props.scrollToIndex !== state.scrollToIndex) {
      newState.scrollToIndex = props.scrollToIndex;
    } else {
      newState.scrollToIndex = -1;
    }
    return newState;
  }

  componentDidUpdate(prevProps: Props<T>) {
    const { variables, refetchRequestCounter } = prevProps;
    if (variables !== this.props.variables || refetchRequestCounter !== this.props.refetchRequestCounter) {
      if (this.loaderCacheResetor) {
        this.loaderCacheResetor();
      }
    }
    if(refetchRequestCounter !== this.props.refetchRequestCounter){
      this.refetchQuery(this.props.variables);
    }
  }

  render() {
    const {
      displayRowCount,
      graphqlQuery,
      columns,
      pageSize,
      variables,
      refetchRequestCounter,
      listPropsName,
      onColumnPropsChanged,
      onRowClick,
      listItemHeight,
      listItemRenderer,
      listModeBreakPoint,
      parseListFromQueryResult,
      updateQuery,
      selectedItems,
      onDataFetched,
      tableClassName,
      listClassName,
      rootClassName,
      headerComponent,

      checkBoxColumnMode,
      setSelectedItems,
      selectedAll,
      setSelectedAll,
      clearSelectedAll,
      debugname,
      onLoadMore,
      apolloClient,
    } = this.props;
    const { scrollToIndex } = this.state;
    const defaultListResult = {
      edges: new Array<T>(),
      pageInfo: {
        hasNextPage: true,
        rowCount: 0,
      },
    };
    return (
      <Query
        client={apolloClient}
        query={graphqlQuery}
        notifyOnNetworkStatusChange={true}
        variables={variables}
        onCompleted={(data) => {
          if (onDataFetched && this.lastFatchedData !== data) {
            onDataFetched(data);
          }
          this.lastFatchedData = data;
        }}
      >
        {({ networkStatus, fetchMore, data, error, refetch }) => {
          this.refetchQuery = refetch;
          const parseList = parseListFromQueryResult
            ? (queryResult: any) =>
                queryResult
                  ? parseListFromQueryResult(queryResult)
                  : defaultListResult
            : (queryResult: any) => {
                if (queryResult[listPropsName]) {
                  return queryResult[listPropsName];
                } else {
                  return defaultListResult;
                }
              };
          let parsedList = parseList(data);
          if (!parsedList)
            parsedList = {
              edges: [],
              pageInfo: {
                hasNextPage: true,
                rowCount: 0,
              },
            };
          const { pageInfo } = parsedList;
          return (
            <VirtualizedGrid
              displayRowCount={displayRowCount}
              registerForLoaderCacheReset={(resetor: () => void) => {
                this.loaderCacheResetor = resetor;
              }}
              checkBoxColumnMode={checkBoxColumnMode}
              setSelectedItems={setSelectedItems}
              selectedAll={selectedAll}
              setSelectedAll={setSelectedAll}
              clearSelectedAll={clearSelectedAll}
              headerComponent={headerComponent}
              rootClassName={rootClassName}
              tableClassName={tableClassName}
              listClassName={listClassName}
              loading={
                networkStatus === 1 ||
                networkStatus === 2 ||
                networkStatus === 4
              }
              scrollToIndex={scrollToIndex}
              listItemHeight={listItemHeight}
              listItemRenderer={listItemRenderer}
              listModeBreakPoint={listModeBreakPoint}
              onColumnPropsChanged={onColumnPropsChanged}
              onRowClick={onRowClick}
              selectedItems={selectedItems}
              loadMoreRows={async (page: number) => {
                const v = onLoadMore({
                  page,
                  pageSize,
                  after: pageInfo.endCursor,
                });
                this.setState({ variables: v });
                const moreResult = await fetchMore({
                  variables: v,
                  updateQuery: (previousResult, { fetchMoreResult }) => {
                    this.setState({ scrollToIndex: -1 });
                    if (parseListFromQueryResult && !updateQuery) {
                      console.log(
                        "%c updateQuery function must be provided if parseListFromQueryResult function is provided!",
                        "color: red"
                      );
                    }
                    if (!fetchMoreResult) return previousResult;
                    const fetchMoreList = parseList(fetchMoreResult);
                    const previousList = parseList(previousResult);
                    const newList: ApolloListResult<T> = {
                      ...previousList,
                      pageInfo: fetchMoreList.pageInfo,
                      edges: [...previousList.edges, ...fetchMoreList.edges],
                    };
                    if (selectedAll) {
                      const newSelected = range(
                        previousList.edges.length,
                        previousList.edges.length + fetchMoreList.edges.length,
                        1
                      );
                      setSelectedAll([...selectedItems, ...newSelected]);
                    }
                    if (updateQuery) {
                      const updated = updateQuery(previousResult, newList);
                      return updated;
                    } else {
                      return {
                        ...previousResult,
                        [listPropsName]: newList,
                      };
                    }
                  },
                });
                return parseList(moreResult).edges;
              }}
              rowGetter={(index: number) => parsedList.edges[index]}
              totalRowCount={pageInfo.rowCount}
              rowCount={parsedList.edges.length}
              isRowLoaded={(index: number) =>
                parsedList && !!parsedList.edges[index]
              }
              columns={columns}
              pageSize={pageSize}
              initialLoading={networkStatus === 1}
            />
          );
        }}
      </Query>
    );
  }
}

export default ApolloVirtualizedGrid;
export {
  DefaultPageInfoValue,
  SearchMode,
  CheckBoxColumnMode,
  GridColumn,
  VirtualizedGridProps,
   VirtualizedGrid,
} ;
