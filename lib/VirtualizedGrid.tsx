import * as React from "react";
import range from "lodash/range";
import filter from "lodash/filter";
import orderBy from "lodash/orderBy";
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
  ListRowProps,
  SortDirection,
} from "react-virtualized";
import classNames from "classnames";
import update from "immutability-helper";
import { Theme } from "@material-ui/core/styles/createMuiTheme";
import createStyles from "@material-ui/core/styles/createStyles";
import withStyles, { WithStyles } from "@material-ui/core/styles/withStyles";
import Badge from "@material-ui/core/Badge/Badge";
import TableSortLabel from "@material-ui/core/TableSortLabel/TableSortLabel";
import TableCell from "@material-ui/core/TableCell/TableCell";
import Checkbox from "@material-ui/core/Checkbox/Checkbox";
import CircularProgress from "@material-ui/core/CircularProgress/CircularProgress";
import Typography from "@material-ui/core/Typography/Typography";

export enum SearchMode {
  in = 1,
  contain = 2,
  startWith = 3,
}

export enum CheckBoxColumnMode {
  none,
  first,
  last,
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
  sortOrder?: number;
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
  displayRowCount?: boolean;
  rowGetter: (index: number) => T;
  initialLoading: boolean;
  rowCount: number;
  totalRowCount: number;
  rowClassName?: string;
  onRowClick?: (rowData: T, index: number) => void;
  loadMoreRows: (page: number) => Promise<T[]>;
  isRowLoaded: (index: number) => boolean;
  pageSize?: number;
  onColumnPropsChanged?: (
    columns: ReadonlyArray<GridColumn<T>>,
    orderBy: string[]
  ) => void;
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
  footerComponent?: React.ReactNode;
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
      flexDirection: "column",
    },
    autoSizerWrapper: {
      flex: 1,
    },
    placeCenter: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      margin: "auto",
    },
    table: {
      fontFamily: theme.typography.fontFamily,
    },
    list: {
      fontFamily: theme.typography.fontFamily,
    },
    cellLoadingIndicator: {
      backgroundColor: "#DDDDDD",
      flex: 1,
      color: "#DDDDDD",
    },
    flexContainer: {
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box",
    },
    tableRow: {
      cursor: "pointer",
    },
    tableRowHover: {
      "&:hover": {
        backgroundColor:
          theme.palette.type === "light"
            ? "rgba(0, 0, 0, 0.07)" // grey[200]
            : "rgba(255, 255, 255, 0.14)",
      },
    },
    tableCell: {
      flex: 1,
    },
    noClick: {
      cursor: "initial",
    },
    selected: {
      backgroundColor:
        theme.palette.type === "light"
          ? "rgba(0, 0, 0, 0.04)" // grey[100]
          : "rgba(255, 255, 255, 0.08)",
    },
    rowCountPanel: {
      textAlign: "center",
    },
  });

class VritualizedGrid<T> extends React.PureComponent<
  VirtualizedGridProps<T> & WithStyles<typeof styles>
> {
  static defaultProps: any = {
    listItemHeight: 56,
    pageSize: 20,
    listModeBreakPoint: 600,
    checkBoxColumnMode: CheckBoxColumnMode.none,
    displayRowCount: true,
    selectedItems: [],
  };
  infiniteLoader: InfiniteLoader | null = null;
  loadingJobs: { [id: number]: Promise<T[]> } = {};
  getRowClassName({ index }: Index) {
    const { classes, rowClassName, onRowClick, selectedItems } = this.props;

    return classNames(classes.tableRow, classes.flexContainer, rowClassName, {
      [classes.tableRowHover]: index !== -1 && onRowClick != null,
      [classes.selected]: selectedItems && selectedItems.indexOf(index) > -1,
    });
  }

  triggerOnColumnPropsChanged(
    columns: ReadonlyArray<GridColumn<T>>,
    orderBy: string[]
  ) {
    const { onColumnPropsChanged } = this.props;

    if (!onColumnPropsChanged) {
      console.log(
        "%c onColumnPropsChanged function is not provided!",
        "color: red"
      );
      return;
    }
    this.resetInfiniteLoaderCache();
    onColumnPropsChanged(columns, orderBy);
  }

  handleOnRowClick(event: RowMouseEventHandlerParams) {
    const { onRowClick } = this.props;
    if (onRowClick) onRowClick(event.rowData as any, event.index);
  }

  headerRenderer({ label, columnData }: TableHeaderProps) {
    const { sortable, labelAlign, sortDirection, sorted, sortOrder } =
      columnData;
    const { classes, columns } = this.props;
    const headerHeight = 56;
    const columnIndex = columns.indexOf(columnData);
    const inner = sortable ? (
      <Badge badgeContent={sortOrder} color="primary">
        <TableSortLabel
          direction={sortDirection === "ASC" ? "asc" : "desc"}
          active={sorted}
          onClick={() => {
            let newColumn = Object.assign({}, columnData);
            if (sorted) {
              switch (sortDirection) {
                case "ASC":
                  newColumn.sortDirection = "DESC";
                  break;
                case "DESC":
                  newColumn.sorted = false;
                  newColumn.sortDirection = null;
                  break;
                default:
                  newColumn.sortDirection = "ASC";
                  newColumn.sorted = true;
              }
            } else {
              newColumn.sortDirection = "ASC";
              newColumn.sorted = true;
            }

            var nextColumns = columns;

            if (!sorted && newColumn.sorted) {
              // change from non ordering to ordering
              let maxSortOrder = 0;
              for (let c of columns) {
                let sortOrder = c.sortOrder ? c.sortOrder : 0;
                if (sortOrder > 0) {
                  if (c.key !== newColumn.key) {
                    maxSortOrder = Math.max(maxSortOrder, sortOrder);
                  }
                }
              }
              newColumn.sortOrder = maxSortOrder + 1;
            } else if (sorted && !newColumn.sorted) {
              // change from ordering to non ordering
              for (let c of columns) {
                let sortOrder = c.sortOrder ? c.sortOrder : 0;
                if (sortOrder > 0) {
                  if (c.key !== newColumn.key) {
                    if (sortOrder > newColumn.sortOrder) {
                      nextColumns = update(nextColumns, {
                        [columns.indexOf(c)]: {
                          sortOrder: {
                            $set: sortOrder - 1,
                          },
                        },
                      });
                    }
                  }
                }
              }
              newColumn.sortOrder = null;
            }

            nextColumns = update(nextColumns, {
              [columnIndex]: {
                $set: newColumn,
              },
            });
            var orders: GridColumn<T>[] = [];
            nextColumns.forEach((c) => {
              if (c.sorted && c.sortOrder) {
                orders.push(c);
              }
            });
            var _orderBy = orderBy(orders, ["sortOrder"], ["asc"]).map((c) => {
              switch (c.sortDirection) {
                case SortDirection.DESC:
                  return `${c.key}_Desc`;
                case SortDirection.ASC:
                default:
                  return c.key;
              }
            });
            this.triggerOnColumnPropsChanged(nextColumns, _orderBy);
          }}
        >
          {label}
        </TableSortLabel>
      </Badge>
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
          [classes.noClick]: onRowClick == null,
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
      return {
        ...rowData,
        selected: selectedItems && selectedItems.includes(index),
        index,
      };
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
      listClassName,
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
                selectedItems && selectedItems.indexOf(index) > -1,
            }),
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
      selectedItems,
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
                setSelectedAll(range(0, rowCount, 1));
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
                onClick={(e) => {
                  e.stopPropagation();
                }}
                checked={params.rowData.selected}
                onChange={(e, checked) => {
                  const { index } = params.rowData;
                  if (checked) {
                    setSelectedItems(
                      update(selectedItems, {
                        $push: [index],
                      })
                    );
                  } else if (selectedItems.indexOf(index) > -1) {
                    setSelectedItems(
                      update(selectedItems, {
                        $splice: [[selectedItems.indexOf(index), 1]],
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
      checkBoxColumnMode,
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
        {filter(
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
                index: params.rowData.index,
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
      footerComponent,
      registerForLoaderCacheReset,
    } = this.props;
    return (
      <div className={`${classes.root} ${rootClassName}`}>
        {headerComponent}
        <div className={classes.autoSizerWrapper}>
          <InfiniteLoader
            ref={(infiniteLoader) => {
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
                return job
                  .then((result) => {
                    delete this.loadingJobs[page];
                    return result;
                  })
                  .catch((e) => {
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
            {(infiniteLoaderProps) => (
              <AutoSizer defaultHeight={500}>
                {(size) => {
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
        {this.props.displayRowCount ? (
          <Typography
            variant="body2"
            color={
              this.props.selectedAll || this.props.selectedItems.length > 0
                ? "secondary"
                : "textPrimary"
            }
            className={classes.rowCountPanel}
          >
            {(() => {
              if (
                this.props.selectedAll ||
                this.props.selectedItems.length > 0
              ) {
                if (this.props.selectedAll) {
                  return `Total ${totalRowCount} rows selected`;
                } else {
                  return `${this.props.selectedItems.length} of ${totalRowCount} rows selected`;
                }
              } else {
                return `${rowCount} of ${totalRowCount} rows loaded`;
              }
            })()}
          </Typography>
        ) : null}
        {footerComponent}
      </div>
    );
  }
}

export default withStyles(styles)(VritualizedGrid);
