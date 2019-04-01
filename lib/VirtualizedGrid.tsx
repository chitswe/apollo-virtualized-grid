import * as React from "react";
import * as _ from "lodash";
import {
  Theme,
  createStyles,
  WithStyles,
  TableSortLabel,
  TableCell,
  withStyles,
  CircularProgress,
  Checkbox
} from "@material-ui/core";
import {
  AutoSizer,
  Table,
  Index,
  Column,
  TableHeaderProps,
  SortDirectionType,
  TableCellProps,
  TableCellDataGetterParams,
  InfiniteLoader,
  RowMouseEventHandlerParams,
  Size,
  InfiniteLoaderChildProps,
  List,
  ListRowProps
} from "react-virtualized";
import classNames from "classnames";
import update from "immutability-helper";

export enum SearchMode {
  in = 1,
  contain = 2,
  startWith = 3
}

export enum CheckBoxColumnMode {
  none,
  first,
  last
}

export interface GridColumn<T> {
  label: React.ReactNode;
  key: string;
  width: number;
  flexGrow?: number;
  sortable?: boolean;
  searchMode?: SearchMode;
  sortDirection?: SortDirectionType;
  sorted?: boolean;
  labelAlign?: "right" | "left" | "center";
  textAlign?: "right" | "left" | "center";
  format?: (props: {
    key: string;
    rowData: T;
    selected: boolean;
    index: number;
  }) => React.ReactNode;
  hideAt?: number;
}

export interface VirtualizedGridProps<T> {
  columns: ReadonlyArray<GridColumn<T>>;
  rowGetter: (index: number) => T;
  initialLoading: boolean;
  rowCount: number;
  totalRowCount: number;
  rowClassName?: string;
  onRowClick?: (rowData: T, index: number) => void;
  loadMoreRows: (page: number) => Promise<T[]>;
  isRowLoaded: (index: number) => boolean;
  pageSize?: number;
  onColumnPropsChanged?: (columns: ReadonlyArray<GridColumn<T>>) => void;
  listItemHeight?: number;
  listModeBreakPoint?: number;
  listItemRenderer?: (renderProps: {
    rowData: T;
    key: string;
    style: React.CSSProperties;
    index?: number;
    className?: string;
    onClick?: () => void;
    selected: boolean;
  }) => JSX.Element;
  selectedItems: number[];
  scrollToIndex?: number;
  loading?: boolean;
  tableClassName?: string;
  listClassName?: string;
  headerComponent?: React.ReactNode;
  rootClassName?: string;
  checkBoxColumnMode?: CheckBoxColumnMode;
  setSelectedItems?: (items: number[]) => void;
  selectedAll?: boolean;
  setSelectedAll?: (items: number[]) => void;
  clearSelectedAll?: () => void;
  registerForLoaderCacheReset?: (resetLoaderCache: () => void) => void;
}

const styles = (theme: Theme) =>
  createStyles({
    root: {
      flex: 1,
      display: "flex",
      flexDirection: "column"
    },
    autoSizerWrapper: {
      flex: 1
    },
    placeCenter: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      margin: "auto"
    },
    table: {
      fontFamily: theme.typography.fontFamily
    },
    list: {
      fontFamily: theme.typography.fontFamily
    },
    cellLoadingIndicator: {
      backgroundColor: "#DDDDDD",
      flex: 1,
      color: "#DDDDDD"
    },
    flexContainer: {
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box"
    },
    tableRow: {
      cursor: "pointer"
    },
    tableRowHover: {
      "&:hover": {
        backgroundColor: theme.palette.grey[200]
      }
    },
    tableCell: {
      flex: 1
    },
    noClick: {
      cursor: "initial"
    },
    selected: {
      backgroundColor: theme.palette.grey[300]
    }
  });

class VritualizedGrid<T> extends React.PureComponent<
  VirtualizedGridProps<T> & WithStyles<typeof styles>
> {
  static defaultProps: any = {
    listItemHeight: 56,
    pageSize: 20,
    listModeBreakPoint: 600,
    checkBoxColumnMode: CheckBoxColumnMode.none
  };
  infiniteLoader: InfiniteLoader | null = null;
  loadingJobs: { [id: number]: Promise<T[]> } = {};
  getRowClassName({ index }: Index) {
    const { classes, rowClassName, onRowClick, selectedItems } = this.props;

    return classNames(classes.tableRow, classes.flexContainer, rowClassName, {
      [classes.tableRowHover]: index !== -1 && onRowClick != null,
      [classes.selected]: selectedItems && selectedItems.indexOf(index) > -1
    });
  }

  triggerOnColumnPropsChanged(columns: ReadonlyArray<GridColumn<T>>) {
    const { onColumnPropsChanged } = this.props;

    if (!onColumnPropsChanged) {
      console.log(
        "%c onColumnPropsChanged function is not provided!",
        "color: red"
      );
      return;
    }
    this.resetInfiniteLoaderCache();
    onColumnPropsChanged(columns);
  }

  handleOnRowClick(event: RowMouseEventHandlerParams) {
    const { onRowClick } = this.props;
    if (onRowClick) onRowClick(event.rowData as any, event.index);
  }

  headerRenderer({ label, columnData }: TableHeaderProps) {
    const { sortable, labelAlign, sortDirection, sorted } = columnData;
    const { classes, columns } = this.props;
    const headerHeight = 56;

    const inner = sortable ? (
      <TableSortLabel
        direction={sortDirection === "ASC" ? "asc" : "desc"}
        active={sorted}
        onClick={() => {
          let newColumn = Object.assign({}, columnData);
          if (sorted) {
            switch (sortDirection) {
              case "ASC":
                newColumn = update(columnData, {
                  sortDirection: {
                    $set: "DESC"
                  }
                });
                break;
              case "DESC":
                newColumn = update(columnData, {
                  sorted: {
                    $set: false
                  }
                });
                break;
              default:
                newColumn = update(columnData, {
                  sortDirection: {
                    $set: "ASC"
                  },
                  sorted: {
                    $set: true
                  }
                });
            }
          } else {
            newColumn = update(columnData, {
              sortDirection: {
                $set: "ASC"
              },
              sorted: {
                $set: true
              }
            });
          }
          const newColumns: Array<GridColumn<T>> = [];
          columns.forEach(value => {
            if (value === columnData) newColumns.push(newColumn);
            else
              newColumns.push(
                update(value, {
                  sorted: {
                    $set: false
                  }
                })
              );
          });
          this.triggerOnColumnPropsChanged(newColumns);
        }}
      >
        {label}
      </TableSortLabel>
    ) : (
      label
    );

    return (
      <TableCell
        component="div"
        className={classNames(
          classes.tableCell,
          classes.flexContainer,
          classes.noClick
        )}
        variant="head"
        style={{ height: 56 }}
        align={labelAlign}
      >
        {inner}
      </TableCell>
    );
  }

  cellRenderer({ cellData, columnData: { textAlign } }: TableCellProps) {
    const { classes, onRowClick } = this.props;
    return (
      <TableCell
        component="div"
        className={classNames(classes.tableCell, classes.flexContainer, {
          [classes.noClick]: onRowClick == null
        })}
        variant="body"
        style={{ height: 56 }}
        align={textAlign}
      >
        {cellData === "--LOADING--" ? (
          <div className={classes.cellLoadingIndicator}>A</div>
        ) : (
          cellData
        )}
      </TableCell>
    );
  }

  rowGetter(index: number) {
    const { rowGetter, selectedItems } = this.props;
    const rowData: any = rowGetter(index);
    if (rowData) {
      rowData.selected = selectedItems && selectedItems.includes(index);
      rowData.index = index;
    }
    return rowData;
  }

  renderList(
    { width, height }: Size,
    { onRowsRendered, registerChild }: InfiniteLoaderChildProps
  ) {
    const {
      listItemHeight,
      rowCount,
      totalRowCount,
      pageSize,
      listItemRenderer,
      classes,
      onRowClick,
      selectedItems,
      scrollToIndex,
      listClassName
    } = this.props;
    return (
      <List
        scrollToIndex={
          scrollToIndex || scrollToIndex === 0 ? scrollToIndex : -1
        }
        className={`${classes.list} ${listClassName}`}
        ref={registerChild}
        height={height}
        width={width}
        onRowsRendered={onRowsRendered}
        rowHeight={listItemHeight}
        rowCount={Math.min(rowCount + pageSize, totalRowCount)}
        rowRenderer={(props: ListRowProps) => {
          const { index, style } = props;
          const rowData = this.rowGetter(index);
          return listItemRenderer({
            rowData,
            key: index.toString(),
            style,
            index,
            selected: selectedItems && selectedItems.indexOf(index) > -1,
            onClick: () => {
              if (onRowClick) onRowClick(rowData, index);
            },
            className: classNames(classes.tableRow, {
              [classes.tableRowHover]: index !== -1 && onRowClick != null,
              [classes.selected]:
                selectedItems && selectedItems.indexOf(index) > -1
            })
          });
        }}
      />
    );
  }

  renderCheckBoxColumn() {
    const {
      setSelectedItems,
      setSelectedAll,
      clearSelectedAll,
      selectedAll,
      rowCount,
      classes,
      selectedItems
    } = this.props;
    return (
      <Column
        dataKey="selected"
        columnData={{}}
        label={
          <Checkbox
            checked={selectedAll}
            onChange={(e, checked) => {
              if (checked) {
                setSelectedAll(_.range(0, rowCount, 1));
              } else {
                clearSelectedAll();
              }
            }}
          />
        }
        width={96}
        className={classNames(classes.flexContainer, "selected")}
        headerRenderer={this.headerRenderer.bind(this)}
        cellRenderer={this.cellRenderer.bind(this)}
        disableSort={true}
        cellDataGetter={(params: TableCellDataGetterParams) => {
          if (!params.rowData) return "--LOADING--";
          else {
            return (
              <Checkbox
                checked={params.rowData.selected}
                onChange={(e, checked) => {
                  const { index } = params.rowData;
                  if (checked) {
                    setSelectedItems(
                      update(selectedItems, {
                        $push: [index]
                      })
                    );
                  } else if (selectedItems.indexOf(index) > -1) {
                    setSelectedItems(
                      update(selectedItems, {
                        $splice: [[selectedItems.indexOf(index), 1]]
                      })
                    );
                  }
                }}
              />
            );
          }
        }}
      />
    );
  }

  renderTable(
    { width, height }: Size,
    { onRowsRendered, registerChild }: InfiniteLoaderChildProps
  ) {
    const {
      classes,
      columns,
      rowCount,
      totalRowCount,
      pageSize,
      scrollToIndex,
      tableClassName,
      checkBoxColumnMode
    } = this.props;
    return (
      <Table
        scrollToIndex={
          scrollToIndex || scrollToIndex === 0 ? scrollToIndex : -1
        }
        onRowClick={this.handleOnRowClick.bind(this)}
        onRowsRendered={onRowsRendered}
        ref={registerChild}
        rowGetter={({ index }) => {
          return this.rowGetter(index);
        }}
        className={`${classes.table} ${tableClassName}`}
        height={height}
        width={width}
        rowHeight={56}
        headerHeight={56}
        rowCount={Math.min(totalRowCount, rowCount + pageSize)}
        rowClassName={this.getRowClassName.bind(this)}
      >
        {checkBoxColumnMode === CheckBoxColumnMode.first
          ? this.renderCheckBoxColumn()
          : null}
        {_.filter(
          columns,
          (column: GridColumn<T>) => !column.hideAt || column.hideAt < width
        ).map((column: GridColumn<T>) => {
          const cellDataGetter = (params: TableCellDataGetterParams) => {
            if (!params.rowData) return "--LOADING--";
            else if (column.format) {
              return column.format({
                key: params.dataKey,
                rowData: params.rowData,
                selected: params.rowData.selected,
                index: params.rowData.index
              });
            } else {
              const cellData = params.rowData[params.dataKey];
              return cellData ? cellData.toString() : "";
            }
          };

          return (
            <Column
              key={column.key}
              columnData={column}
              dataKey={column.key}
              label={column.label}
              width={column.width}
              className={classNames(classes.flexContainer, column.key)}
              headerRenderer={this.headerRenderer.bind(this)}
              cellRenderer={this.cellRenderer.bind(this)}
              disableSort={!column.sortable}
              cellDataGetter={cellDataGetter}
              flexGrow={column.flexGrow}
            />
          );
        })}
        {checkBoxColumnMode === CheckBoxColumnMode.last
          ? this.renderCheckBoxColumn()
          : null}
      </Table>
    );
  }

  resetInfiniteLoaderCache() {
    this.loadingJobs = {};
    this.infiniteLoader.resetLoadMoreRowsCache();
  }

  render() {
    const {
      rowCount,
      loadMoreRows,
      isRowLoaded,
      pageSize,
      totalRowCount,
      listModeBreakPoint,
      loading,
      classes,
      rootClassName,
      headerComponent,
      registerForLoaderCacheReset
    } = this.props;
    return (
      <div className={`${classes.root} ${rootClassName}`}>
        {headerComponent}
        <div className={classes.autoSizerWrapper}>
          <InfiniteLoader
            ref={infiniteLoader => {
              this.infiniteLoader = infiniteLoader;
              if (registerForLoaderCacheReset) {
                registerForLoaderCacheReset(
                  this.resetInfiniteLoaderCache.bind(this)
                );
              }
            }}
            loadMoreRows={({ startIndex, stopIndex }) => {
              const page = Math.round(startIndex / pageSize + 1);
              if (!this.loadingJobs[page]) {
                const job = loadMoreRows(page);
                this.loadingJobs[page] = job;
                return job.catch(e => {
                  delete this.loadingJobs[page];
                });
              } else {
                return this.loadingJobs[page];
              }
            }}
            rowCount={Math.min(rowCount + pageSize, totalRowCount)}
            minimumBatchSize={pageSize}
            isRowLoaded={({ index }) => isRowLoaded(index)}
          >
            {infiniteLoaderProps => (
              <AutoSizer defaultHeight={500}>
                {size => {
                  if (loading)
                    return (
                      <CircularProgress
                        color="secondary"
                        className={classes.placeCenter}
                      />
                    );
                  else if (size.width <= listModeBreakPoint)
                    return this.renderList(size, infiniteLoaderProps);
                  else return this.renderTable(size, infiniteLoaderProps);
                }}
              </AutoSizer>
            )}
          </InfiniteLoader>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(VritualizedGrid);
