// 参考自 https://observablehq.com/@d3/ohlc-chart
/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 💡 创建一个时间解释器 parser，可以将特定格式的字符串解析为时间对象 Date
// 具体参考 d3-time-format 模块的官方文档 https://d3js.org/d3-time-format
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间格式器
// 参数 `%Y-%m-%d` 称为 specifier 时间格式说明符，这里用于匹配的字符串格式是「年-月-日」
// %Y 表示年份（用四个数字表示）
// %m 表示月份（用两个数字表示，不足双位数的月份在前面添加 0 来补足）
// %d 表示日期（用两个数字表示，不足的双位数的日期在前面添加 0 来补足）
parseDate = d3.timeParse("%Y-%m-%d")

// 数据来源 Observable 一个内置的数据集（在标准库中）appl
// 相关介绍可参考 https://observablehq.com/@observablehq/sample-datasets?collection=@observablehq/getting-data-in-and-out
// 这提取了最后的 130 个数据点进行可视化
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/03851c822109259ae51da278a017a3e1/raw/83bf854d8b7a556451e7903ba7136da392d24174/ticker.csv";

d3.csv(dataURL,
  // 处理函数，对每行数据进行转换
  d => {
    // 使用前面 ☝️ 创建的时间解释器，将数据点的属性 d["Date"] 其值是字符串，转换为 Date 时间对象
    const date = parseDate(d["Date"]);
    return {
      date,
      // 将其他属性值（字符串）转换为数字
      high: +d["High"],
      low: +d["Low"],
      open: +d["Open"],
      close: +d["Close"]
    }
  }
).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 选取最后 90 个数据点进行可视化
  const ticker = data.slice(-90)

  console.log(ticker);
  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是不同的日期（这里看作不同的类别），使用 d3.scaleBand 构建一个带状比例尺
  // 使用 d3-scale 模块
  // 具体参考官方文档 https://d3js.org/d3-scale/band
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#带状比例尺-band-scales
  // 💡（即使绘制的 OHLC 图是股价随时间的变化）横坐标并不直接采用时间比例尺 time scale，而采用带状比例尺 band scale（将不同的日期看作不同的类别），以便对横坐标的时间（日期）进行定制化修改
  // 由于周六日股票市场并没有交易，在数据集中是没有对应的股价数据的
  // 所以需要将这些日期从数组中删掉，以避免绘制股价图时出现空白断连的情况
  // 💡 但是即使筛掉了周六日的日期，如果可视化的数据对应的时间跨度包含了一些公众假期（如圣诞节），假如位于工作日 weekdays 中，依然会造成股价图出现空白断连的情况，但是出现这种情况的概率（与周六日相比）会低一些，所以这里并没有对这种情况进行额外的处理
  const x = d3.scaleBand()
    // 设置定义域范围
    // 从数据集中获取日期范围（生成一个数组，包含一系列的日期）
    // 其中 d3.timeDay 是一个时间边距计算器（以下称为 interval），用于生成特定间距的时间
    // 具体参考 d3-time 模块的官方文档 https://d3js.org/d3-time
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间边距计算器
    // d3.timeDay 是以「天」为间距的 interval，时间格式采用地方时
    // 调用方法 interval.range(start, stop[, step]) 返回一个包含一系列 Date 对象的数组
    // 其中第一个、第二个参数 start（包含） 和 stop（不包括）用于设置时间范围
    // 第三个（可选）参数 step 是一个整数，用于设置步长，即每距离多长的时间采集一个时间点，生成一个 Date 对象，默认值为 1
    // 由于数据集 ticker 的元素已经按时间顺序进行排序，所以可以直接通过第一个元素 ticker[0] 和最后一个元素 ticker[ticker.length-1] 获取到数据集的时间范围
    // 再分别提取出时间对象 element.date 作为方法 interval.range(start, stop) 第一个和第二参数
    // ⚠️ 由于方法 interval.range(start, stop) 所生成的一系列 Date 对象中，并不包含第二个参数 stop 所指定的时间
    // 所以这里不能直接传入 ticker[ticker.length-1].date（它是一个 Date 对象），而是要将它适当「延长」，这里就先将 Date 对象转换为毫秒数 +ticker[ticker.length-1].date 再加上 1 毫秒，这样就保证了所生成的一系列 Date 对象中包含数据集所有时间点
    // 然后通过 arr.filter() 将数据集中的日期进行筛选过滤
    // 由于 interval 是以「天」为间隔，所以从 start 至 stop（不包含）范围中的所有日期都包含在内
    // 通过调用 Date 对象的方法 date.getDay() 所返回的数值，判定该日期对应周几
    // 周日对应的是 0，周六对应的是 6，要筛掉这些时间对象
    .domain(d3.timeDay
      .range(ticker[0].date, +ticker[ticker.length - 1].date + 1)
      .filter(d => d.getDay() !== 0 && d.getDay() !== 6))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight])
    .padding(0.2); // 并设置间隔占据（柱子）区间的比例

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（股价），使用 d3.scaleLog 构建一个对数比例尺
  // 这里采用对数比例尺的原因 ❓
  // 数据/股价的波动/差距并不大，是否也可以使用 d3.scaleLinear() 构建线性比例尺 ❓
  const y = d3.scaleLog()
    // 设置定义域范围 [ymin, ymax] ⚠️ 最小值并不是从 0 开始
    // 最小值是从数据集中的每个数据点的属性 d.low
    // 最大值是从数据集中的每个数据点的属性 d.high（当天最高股价）获取，取其中的最大值
    .domain([d3.min(ticker, d => d.low), d3.max(ticker, d => d.high)])
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    .rangeRound([height - marginBottom, marginTop]);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - marginBottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    .call(d3.axisBottom(x)
      // 自定义坐标轴的刻度值
      // 通过 axis.tickValues([values]) 传递一个数组，用其中的元素覆盖比例尺自动生成的刻度值
      // 由于在 ☝️ 前面构建横坐标轴比例尺时，定义域是一系列日期（以「天」为间隔的，筛掉周六日），如果采用默认配置绘制坐标轴，就会将一系列的工作日（日期）作为刻度值，当图表的宽度有限时就会显得很拥挤
      // 所以这里手动设置刻度值，以便减少所生成的刻度数量
      // 使用 d3.timeMonday 创建一个新的以「周」为单位（将周一作为计算点 💡 也可以选择工作日的其他日子作为计算点）的时间边距器 interval，生成特定的一系列日期作为刻度值，覆盖比例尺自动生成的刻度值
      // d3.timeMonday 是以「周」为间距的 interval，且以周一为每一周的开始，时间格式采用地方时
      // 方法 interval.every(step) 可以基于原有的采集时间间隔，进一步实现快捷的定制，相当于按照特定的步长 step 对所生成的数组进行二次采集，这样就可以在 svg 宽度较小时，减少所生成的刻度数量
      // 这里 width > 720 ? 1 : 2 是指根据 svg 的宽度，设置不同的采集步长，如果宽度大于 720px 步长为 1，就相当于采用原本生成的数组，如果宽度小于 720px 步长为 2，则相隔一个元素进行二次采集
      // 调用方法 interval.range(start, stop) 生成一系列 Date 对象（用数组包含）
      .tickValues(d3.timeMonday
        .every(width > 720 ? 1 : 2)
        .range(ticker[0].date, ticker[ticker.length - 1].date))
      // 通过 axis.tickFormat() 设置刻度值格式
      // 由于前面所设置的刻度值是 Date 日期对象，默认转换生成的字符串很复杂，可读性很低，不适合直接作为刻度值
      // 所以这里使用了 d3.timeFormat() 构建一个时间格式器，用于将日期对象转变为特定格式的字符串
      // 具体参考 d3-time-format 模块的官方文档 https://d3js.org/d3-time-format
      // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间格式器
      // 格式器的参数 %-m/%-d 称为 specifier 时间格式说明符，它类似于正则表达式，由一系列指令构成
      // 其中 %-m 表示月份，而 %-d 表示日期，其中的横线 - 表示如果月份或日期用数值表示是一位数时（例如 1 月 1 日）不必用 0 填充成两位数（这是默认行为），然后这两个数值用 / 斜线分隔
      .tickFormat(d3.timeFormat("%-m/%-d")))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove());
  // 💡 注意以上通过方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    .call(d3.axisLeft(y)
      // 通过 axis.tickFormat() 设置刻度值格式
      // 这里使用了 d3.format() 构建一个数值格式器，对数字进行修约等处理，生成更易于阅读的刻度值
      // 具体参考 d3-format 模块的官方文档 https://d3js.org/d3-format
      // 格式器的参数 $~f 称为 specifier 数字格式说明符，它类似于正则表达式，由一系列指令构成
      // 其中 $ 表示在数值前面添加金钱（美元）符号，而 ~ 表示删掉无用的零（例如位于小数点后面的最后的一些零，一般只是用于表示精度）
      // 其中 f 表示需要将数值的小数点数量固定到几位，但是这里它的前面并没有给定数值，所以截取到整数，舍弃小数点后面的数值
      .tickFormat(d3.format("$~f"))
      // 自定义坐标轴的刻度值
      // 通过 axis.tickValues([values]) 传递一个数组，用其中的元素覆盖比例尺自动生成的刻度值
      // 这里创建一个线性比例尺 d3.scaleLinear() 来计算/生成刻度值
      // 其定义域与 y 比例尺（对数比例尺）一样（复用），其范围也是股价的最低值和最高值
      // 然后使用 scale.ticks() 生成一个数组
      // 该方法可以传入一个数字作为可选参数，以指定生成多少个刻度值，默认元素的数量是 10（不过实际上 D3 会根据比例尺的类型和定义域的范围进行调整，以便生成的刻度值更易于阅读，让刻度值更具有规律，例如 5 或 10 的倍数）
      // 这里创建一个线性比例尺用于重新生成刻度值的原因 ❓
      // 两个比例尺（线性比例尺和对数比例尺）生成的刻度值并没有什么区别
      .tickValues(d3.scaleLinear().domain(y.domain()).ticks()))
    .call(g => g.selectAll(".tick line").clone() // 这里复制了一份刻度线，用以绘制横向的参考线
      .attr("stroke-opacity", 0.2) // 调小参考线的透明度
      .attr("x2", width - marginLeft - marginRight)) // 调整复制后的刻度线的终点位置（往右移动）
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove());

  /**
   *
   * 绘制美国线
   *
   */
  // 用于格式化数据的辅助函数
  // 使用了 d3.timeFormat() 创建一个时间格式器，用于将日期对象转变为特定格式的字符串
  // 这里格式器的作用是将日期对象转换为「月份 日期，年份」格式的字符串
  const formatDate = d3.timeFormat("%B %-d, %Y");
  // 使用了 d3.format() 创建一个数值格式器，对数字进行修约等处理，生成更易于阅读的数值
  // 这里的格式器的作用是将数字保留 2 位小数
  const formatValue = d3.format(".2f");
  // 该函数的作用是对传入的两个数据进行转换（在其中会使用格式器进行数值处理）
  // 最外层是一个立即执行函数，它接受的参数是一个数值格式器 d3.format("+.2%")
  // 这个格式器的作用是将数字转换位百分比，并保留 2 位小数，而且会根据正负性，在数值前面添加正负号
  // 立即执行函数返回一个函数，该函数接受两个参数 y0 和 y1
  // 根据后面 👇 调用的情况，传入的两个值是开盘价 d.Open 和收盘价 d.Close，该函数会对它们进行转换
  // 求出两者之差相对于开盘价的值 (y1 - y0) / y0，并用数值格式器对计算结果进行处理
  const formatChange = ((f) => (y0, y1) => f((y1 - y0) / y0))(d3.format("+.2%"));

  // 为股价图创建一个容器
  const g = svg.append("g")
      // 设置路径描边的宽度
      .attr("stroke-width", 2)
      // 路径只需要描边，不需要填充
      .attr("fill", "none")
    .selectAll("path") // 使用 <path> 元素绘制线段
    // 绑定数据
    .data(ticker)
    .join("path") // 将这些路径绘制到页面上
      // 手动编写出每个线段的绘制路径
      // 首先 M${x(d.date)},${y(d.low)} 是将画笔移动到对应的位置，横坐标值是基于所绑定的数据点的 d.date 日期（并通过通过横坐标轴的比例尺 x 映射得到的）；纵坐标值是基于当天股价的最低值（并通过纵坐标轴比例尺 y 映射得到的）
      // 然后 V${y(d.high)} 是垂直画出一条线段，终点位置是基于当天股价的最高值
      // 接着 M${x(d.date)},${y(d.open)} 将画笔（纵坐标值）移动到当天开盘价的位置（横坐标值基于日期）
      // 然后 h-4 是小写字母的命令，采用相对定位（即操作时基于上一个点的定位），这里表示从上一个点开始，向左绘制一小段水平线，长度为 4px
      // 接着 M${x(d.date)},${y(d.close)} 将画笔（纵坐标值）移动到当天收盘价的位置（横坐标值基于日期）
      // 然后 h4 是小写字母的命令，这里表示从上一个点开始，向右绘制一小段水平线，长度为 4px
      .attr("d", d => `
          M${x(d.date)},${y(d.low)}V${y(d.high)}
          M${x(d.date)},${y(d.open)}h-4
          M${x(d.date)},${y(d.close)}h4
        `)
      // 设置描边的颜色
      // 基于开盘价 d.Open 和收盘价 d.Close 的大小关系设置不同的颜色
      // d3.schemeSet1 是一个 Categorical Color Scheme 分类型的配色方案
      // 预选了 9 种色彩用于标识不同的类别
      // 具体可参考 d3-scale-chromatic 模块的官方文档 https://d3js.org/d3-scale-chromatic/categorical#schemeSet1
      // 当开盘价大于收盘价 d.Open > d.Close 则采用配色方案（数组）的第一个元素 d3.schemeSet1[0] 即红色 #e41a1c
      // 当收盘价大于开盘价 d.Close > d.Open 则采用配色方案（数组）的第三个元素 d3.schemeSet1[2] 即绿色 #4daf4a
      // 当开盘价等于收盘价，则采用配色方案（数组）的最后一个元素 d3.schemeSet1[8] 即灰色 #999999
      .attr("stroke", d => d.open > d.close ? d3.schemeSet1[0]
      : d.close > d.open ? d3.schemeSet1[2]
        : d3.schemeSet1[8])
    // 为每条线段添加注释信息
    // 以 tooltip 的方式展示注释信息，即鼠标 hover 到特定的区域时才显示一个带有注释信息的浮窗
    .append("title")
    .text(d => `${formatDate(d.date)}
Open: ${formatValue(d.open)}
Close: ${formatValue(d.close)} (${formatChange(d.open, d.close)})
Low: ${formatValue(d.low)}
High: ${formatValue(d.high)}`);
});
