import * as React from "react";
import VirtualizedGrid, {
  GridColumn,
  CheckBoxColumnMode
} from "./VirtualizedGrid";
import { Query } from "react-apollo";
import ApolloClient from "apollo-client";

export type PageInfo = {
  currentPage?: number;
  endCursor?: string;
  hasNextPage: boolean;
  rowCount: number;
};
export interface ApolloListResult<T> {
  edges: T[];
  pageInfo: PageInfo;
}

export interface ListItemRenderProps<T>{
  rowData: T;
  key: string;
  style: React.CSSProperties;
  index: number;
  className: string;
  onClick: () => void;
  selected: boolean;
}

interface Props<T> {
  columns: ReadonlyArray<GridColumn<T>>;
  pageSize?: number;
  graphqlQuery: any;
  variables: any;
  listPropsName?: string;
  parseListFromQueryResult?: (queryResult: any) => ApolloListResult<T>;
  onColumnPropsChanged?: (columns: ReadonlyArray<GridColumn<T>>, orderBy: string[]) => void;
  onRowClick?: (rowData: T, index: number) => void;
  listItemHeight?: number;
  listModeBreakPoint?: number;
  listItemRenderer?: (renderProps: ListItemRenderProps<T> ) => JSX.Element;
  selectedItems: ReadonlyArray<number>;
  updateQuery?: (previousResult: any, list: ApolloListResult<T>) => any;
  scrollToIndex?: number;
  onDataFetched?: (data: any, variables:any) => void;
  tableClassName?: string;
  listClassName?: string;
  rootClassName?: string;
  headerComponent?: React.ReactNode;
  checkBoxColumnMode?: CheckBoxColumnMode;
  setSelectedItems?: (items: number[]) => void;
  selectedAll?: boolean;
  setSelectedAll?: (items: number[]) => void;
  clearSelectedAll?: () => void;
  debugname?: string;
  onLoadMore: (pagination:{page:number, pageSize:number, after:string}) => any;
  apolloClient?: ApolloClient<any>;
}

type State = {
  scrollToIndex: number;
  variables:any;
};

class ApolloVirtualizedGrid<T> extends React.Component<Props<T>> {
  static defaultProps: any = {
    pageSize: 20,
    listPropsName: "list"
  };
  state: State = {
    scrollToIndex: -1,
    variables:null
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

  static getDerivedStateFromProps<T>(props:Props<T>, state:State){
    const newState = {...state};
      if(props.variables !== state.variables){
        const {pagination, ...v} = props.variables;
        newState.variables = {...state.variables,...v};
        newState.scrollToIndex = -1;
      }
      if(props.scrollToIndex !== state.scrollToIndex){
        newState.scrollToIndex = props.scrollToIndex;
      }
      return newState;
  } 

  componentDidUpdate(prevProps:Props<T>){
    const {variables} = prevProps;
    if (variables !== this.props.variables) {
      if (this.loaderCacheResetor) {
        this.loaderCacheResetor();
      }
    }
  }


  render() {
    const {
      graphqlQuery,
      columns,
      pageSize,
      variables,
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
      apolloClient
    } = this.props;
    const { scrollToIndex } = this.state;
    const defaultListResult = {
      edges: new Array<T>(),
      pageInfo: {
        hasNextPage: true,
        rowCount: 0
      }
    };
    return (
      <Query
        client={apolloClient}
        query={graphqlQuery}
        notifyOnNetworkStatusChange={true}
        variables={variables}
        onCompleted={data => {
          if (onDataFetched && this.lastFatchedData !== data) {
            onDataFetched(data, this.state.variables);
          }
          this.lastFatchedData = data;
        }}
      >
        {({ networkStatus, fetchMore, data ,error }) => {
          const parseList = parseListFromQueryResult
            ? (queryResult: any) =>
                queryResult ? parseListFromQueryResult(queryResult) : defaultListResult
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
                rowCount:0
              }
            };
          const {
            pageInfo
          } = parsedList;
          return (
            <VirtualizedGrid
              registerForLoaderCacheReset={(resetor: () => void) => {
                this.loaderCacheResetor = resetor;
              }}
              checkBoxColumnMode={checkBoxColumnMode}
              setSelectedItems={setSelectedAll}
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
                const v = onLoadMore({page,pageSize, after: pageInfo.endCursor});
                this.setState({variables:v});
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
                    const newList:ApolloListResult<T> = {
                      ...previousList,
                      pageInfo:fetchMoreList.pageInfo,
                      edges:[...previousList.edges, ...fetchMoreList.edges]
                    };
                    if (updateQuery){                      
                      const updated =  updateQuery(previousResult, newList);
                      return updated;
                    }
                    else{
                      return {
                        ...previousResult,
                        [listPropsName]: newList
                      };
                    }
                  }
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
export {SearchMode,CheckBoxColumnMode,GridColumn,VirtualizedGridProps, default as VirtualizedGrid} from "./VirtualizedGrid";
