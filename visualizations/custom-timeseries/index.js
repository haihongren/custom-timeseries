import React from 'react'
import PropTypes from 'prop-types'
import {
  Card,
  CardBody,
  HeadingText,
  NrqlQuery,
  Spinner,
  LineChart,
  AreaChart,
  NerdletStateContext,
} from 'nr1'

export default class CustomTimeseriesVisualization extends React.Component {
  // Custom props you wish to be configurable in the UI must also be defined in
  // the nr1.json file for the visualization. See docs for more details.
  static propTypes = {
    //title: PropTypes.string,
    query: PropTypes.string,
    accountId: PropTypes.number,
    legend: PropTypes.string,
    lineColor: PropTypes.string,
    selectUnit: PropTypes.string,
    timestampUnit: PropTypes.object,
    chartType: PropTypes.string,
  }

  formatTimeseries(d, filters) {
    let chartTitle = this.props.legend
    let timeunit = 1
    let data = []
    let timeData = []
    let previous = ''
    let customColor = ['red', 'blue', 'green', 'orange', 'yellow', 'black']
    if (this.props.lineColor && this.props.lineColor.includes(',')) {
      customColor = this.props.lineColor.split(',').map((item) => item.trim())
    }
    if (this.props.timestampUnit == 'SECONDS') {
      timeunit = 1000
    }

    let x = null
    let mytimestamp = null
    let series = null
    let itemcount = 0
    for (let r of d) {
      if (r.metadata.hasOwnProperty('name') && r.metadata.name.includes(',')) {
        ;[mytimestamp, series] = r.metadata.name
          .split(',')
          .map((item) => item.trim())
      } else {
        mytimestamp = r.metadata.name
        series = chartTitle
      }
      if (filters) {
        series += ` WHERE ${filters}`
      }
      x = Number(mytimestamp * timeunit)
      let y = r.data[0].y
      if (!isNaN(x)) {
        data.push({ x: x, y: y })
      }

      if (previous !== '' && previous !== series) {
        let metadata = {
          id: 'series' + previous,
          name: previous,
          color: customColor[itemcount % customColor.length],
          viz: 'main',
          units_data: {
            x: 'TIMESTAMP',
            y: this.props.selectUnit,
          },
        }
        itemcount++
        this.addNewItem(metadata, data, timeData)
        data = []
      }
      previous = series
    }

    let metadata = {
      id: 'series' + series,
      name: series,
      color: customColor[itemcount % customColor.length],
      viz: 'main',
      units_data: {
        x: 'TIMESTAMP',
        y: this.props.selectUnit,
      },
    }
    this.addNewItem(metadata, data, timeData)
    return timeData
  }

  addNewItem(metadata, data, timeData) {
    let sorted = data.sort(function (x, y) {
      return y.x - x.x
    })
    data = sorted
    let newitem = { metadata, data }
    console.log("new data series",newitem)
    timeData.push(newitem)
  }
  render() {
    const {
      query,
      accountId,
      legend,
      lineColor,
      selectUnit,
      timestampUnit,
      chartType,
    } = this.props

    const nrqlQueryPropsAvailable =
      query && legend && lineColor && selectUnit && timestampUnit
    accountId

    if (!nrqlQueryPropsAvailable) {
      return <EmptyState />
    }

    return (
      <NerdletStateContext.Consumer>
        {(nerdletState) => {
          const { filters } = nerdletState

          let filteredQuery = query
          if (filters) {
            filteredQuery += ` WHERE ${filters}`
          }
          return (
            <NrqlQuery
              accountId={accountId}
              query={filteredQuery}
              pollInterval={NrqlQuery.AUTO_POLL_INTERVAL}
            >
              {({ data, loading, error }) => {
                if (loading) {
                  return <Spinner />
                }

                if (error) {
                  throw new Error(error.message)
                }
                if (data) {
                  const formattedData = this.formatTimeseries(data, filters)
                  return chartType === 'line' || !chartType ? (
                    <LineChart data={formattedData} fullHeight fullWidth />
                  ) : (
                    <AreaChart data={formattedData} fullHeight fullWidth />
                  )
                }
              }}
            </NrqlQuery>
          )
        }}
      </NerdletStateContext.Consumer>
    )
  }
}

const EmptyState = () => (
  <Card className="EmptyState">
    <CardBody className="EmptyState-cardBody">
      <HeadingText
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Please validate all configuration fields have been filled.
      </HeadingText>
    </CardBody>
  </Card>
)

const ErrorState = () => (
  <Card className="ErrorState">
    <CardBody className="ErrorState-cardBody">
      <HeadingText
        className="ErrorState-headingText"
        spacingType={[HeadingText.SPACING_TYPE.LARGE]}
        type={HeadingText.TYPE.HEADING_3}
      >
        Oops! Something went wrong.
      </HeadingText>
    </CardBody>
  </Card>
)
