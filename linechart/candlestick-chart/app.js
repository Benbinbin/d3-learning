// 参考自 https://observablehq.com/@d3/candlestick-chart/2

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
// 数据来源 Observable 一个内置的数据集（在标准库中）appl
// 相关介绍可参考 https://observablehq.com/@observablehq/sample-datasets?collection=@observablehq/getting-data-in-and-out
// 这提取了最后的 130 个数据点进行可视化
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/03851c822109259ae51da278a017a3e1/raw/83bf854d8b7a556451e7903ba7136da392d24174/ticker.csv";

d3.csv(dataURL, d3.autoType).then((ticker) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
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
  // 💡 这里横坐标使用带状比例尺，而不是像一般的折线图使用连续型比例尺
  // 💡 虽然蜡烛线虽然整体看起来和折线图类似，但是绘制的流程和代码则是与挑选图类似，因为每个「蜡烛图形」都占有一定的宽度，和柱状图的条带类似
  const x = d3.scaleBand()
    // 设置定义域范围
    // 从数据集中获取日期范围（生成一个数组，包含一系列的日期）
    // 其中 d3.utcDay 是一个时间边距计算器（以下称为 interval），用于生成特定间距的时间
    // 具体参考 d3-time 模块的官方文档 https://d3js.org/d3-time
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间边距计算器
    // d3.utcDay 是以「天」为间距的 interval，时间格式采用 UTC 世界协调时间
    // 调用方法 interval.range(start, stop[, step]) 返回一个包含一系列 Date 对象的数组
    // 其中第一个、第二个参数 start（包含） 和 stop（不包括）用于设置时间范围
    // 第三个（可选）参数 step 是一个整数，用于设置步长，即每距离多长的时间采集一个时间点，生成一个 Date 对象，默认值为 1
    // 由于数据集 ticker 的元素已经按时间顺序进行排序，所以可以直接通过第一个元素 ticker.at(0) 和最后一个元素 ticker.at(-1) 获取到数据集的时间范围
    // 再分别提取出时间对象 element.Date 作为方法 interval.range(start, stop) 第一个和第二参数
    // ⚠️ 由于方法 interval.range(start, stop) 所生成的一系列 Date 对象中，并不包含第二个参数 stop 所指定的时间
    // 所以这里不能直接传入 ticker.at(-1).Date（它是一个 Date 对象），而是要将它适当「延长」，这里就先将 Date 对象转换为毫秒数  +ticker.at(-1).Date 再加上 1 毫秒，这样就保证了所生成的一系列 Date 对象中包含数据集所有时间点
    // 然后通过 arr.filter() 将数据集中的日期进行筛选过滤
    // 由于 interval 是以「天」为间隔，所以从 start 至 stop（不包含）范围中的所有日期都包含在内
    // 但是因为周六日股票市场并没有交易，所以在数据集中是没有对应的股价数据的
    // 所以需要将这些日期从数组中删掉，以避免绘制蜡烛线时出现空白断连的情况
    // 通过调用 Date 对象的方法 date.getUTCDay() 所返回的数值，判定该日期对应周几
    // 周日对应的是 0，周六对应的是 6，要筛掉这些时间对象
    .domain(d3.utcDay
      .range(ticker.at(0).Date, +ticker.at(-1).Date + 1)
      .filter(d => d.getUTCDay() !== 0 && d.getUTCDay() !== 6))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    .range([marginLeft, width - marginRight])
    .padding(0.1); // 并设置间隔占据（柱子）区间的比例

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（股价），使用 d3.scaleLog 构建一个对数比例尺
  // 这里采用对数比例尺的原因 ❓
  // 数据/股价的波动/差距并不大，是否也可以使用 d3.scaleLinear() 构建线性比例尺 ❓
  const y = d3.scaleLog()
    // 设置定义域范围 [ymin, ymax] ⚠️ 最小值并不是从 0 开始
    // 最小值是从数据集中的每个数据点的属性 d.Low（当天的最低股价）获取，取其中的最小值
    // 最大值是从数据集中的每个数据点的属性 d.High（当天最高股价）获取，取其中的最大值
    .domain([d3.min(ticker, d => d.Low), d3.max(ticker, d => d.High)])
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
      // d3.utcMonday 是一个时间边距计算器（以下称为 interval），用于生成特定间距的时间（一系列 Date 对象的数组）
      // d3.utcMonday 是以「周」为间距的 interval，且以周一为每一周的开始，时间格式采用 UTC 世界协调时间
      // 方法 interval.every(step) 可以基于原有的采集时间间隔，进一步实现快捷的定制，相当于按照特定的步长 step 对所生成的数组进行二次采集，这样就可以在 svg 宽度较小时，减少所生成的刻度数量
      // 这里 width > 720 ? 1 : 2 是指根据 svg 的宽度，设置不同的采集步长，如果宽度大于 720px 步长为 1，就相当于采用原本生成的数组，如果宽度小于 720px 步长为 2，则相隔一个元素进行二次采集
      // 调用方法 interval.range(start, stop) 生成一系列 Date 对象（用数组包含）
      .tickValues(d3.utcMonday
        .every(width > 720 ? 1 : 2)
        .range(ticker.at(0).Date, ticker.at(-1).Date))
      // 通过 axis.tickFormat() 设置刻度值格式
      // 由于前面所设置的刻度值是 Date 日期对象，默认转换生成的字符串很复杂，可读性很低，不适合直接作为刻度值
      // 所以这里使用了 d3.utcFormat() 构建一个时间格式器，用于将日期对象转变为特定格式的字符串
      // 具体参考 d3-time-format 模块的官方文档 https://d3js.org/d3-time-format
      // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间格式器
      // 格式器的参数 %-m/%-d 称为 specifier 时间格式说明符，它类似于正则表达式，由一系列指令构成
      // 其中 %-m 表示月份，而 %-d 表示日期，其中的横线 - 表示如果月份或日期用数值表示是一位数时（例如 1 月 1 日）不必用 0 填充成两位数（这是默认行为），然后这两个数值用 / 斜线分隔
      .tickFormat(d3.utcFormat("%-m/%-d")))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove());
  // 💡 注意以上通过方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集中的元素 <g> 传递给坐标轴对象的方法，作为第一个参数
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
   * 绘制蜡烛线
   *
   */
  // 为它们创建一个大容器
  const g = svg.append("g")
    // 设置线段路径端点的样式
    .attr("stroke-linecap", "round")
    // 设置线段描边颜色
    .attr("stroke", "black")
    // 为每个蜡烛图形设置一个容器
    .selectAll("g")
    // 绑定数据
    .data(ticker)
    .join("g") // 将这些容器绘制到页面上
    // 并通过设置 CSS 的 transform 属性，将它们分别沿着横坐标移动到相应的位置
    // 基于所绑定数据（一个对象）的属性 d.Date，并使用 x 比例尺进行映射 x(d.Date) 得到在水平方向上的偏移量
    .attr("transform", d => `translate(${x(d.Date)},0)`);

  // 绘制一条线段表示最低价和最高价
  g.append("line") // 使用 <line> 元素绘制线段
    // 只设置线段的起始点和终止点的纵坐标值
    // 由于是垂直向下的直线，所以可以横坐标值采用默认值（都是 0），而前面 ☝️ 在容器上设置了横向的偏移，所以实际上线段在水平方向也会移到相应的位置
    .attr("y1", d => y(d.Low)) // 基于最低价，并通过纵坐标轴的比例尺 y 进行映射，得到起始点的纵坐标值
    .attr("y2", d => y(d.High)); // 基于最高价，并通过纵坐标轴的比例尺 y 进行映射，得到终止点的纵坐标值

  // 绘制一条线段表示开盘价和收盘价
  // 该线段有较大的描边宽度（看起来像是柱状图的条带），而且会进行着色（如果收盘价大于开盘价是绿色，否则为红色）
  g.append("line")
    // 只设置线段的起始点和终止点的纵坐标值，由于是垂直向下的直线，所以可以横坐标值采用默认值
    .attr("y1", d => y(d.Open)) // 起始点的纵坐标值
    .attr("y2", d => y(d.Close)) // 终止点的纵坐标值
    // 设置描边宽度
    // 通过横轴的比例尺的方法 x.bandwidth() 获取 band 的宽度（不包含间隙 padding）
    .attr("stroke-width", x.bandwidth())
    // 设置描边的颜色
    // 基于开盘价 d.Open 和收盘价 d.Close 的大小关系设置不同的颜色
    // d3.schemeSet1 是一个 Categorical Color Scheme 分类型的配色方案
    // 预选了 9 种色彩用于标识不同的类别
    // 具体可参考 d3-scale-chromatic 模块的官方文档 https://d3js.org/d3-scale-chromatic/categorical#schemeSet1
    // 当开盘价大于收盘价 d.Open > d.Close 则采用配色方案（数组）的第一个元素 d3.schemeSet1[0] 即红色 #e41a1c
    // 当收盘价大于开盘价 d.Close > d.Open 则采用配色方案（数组）的第三个元素 d3.schemeSet1[2] 即绿色 #4daf4a
    // 当开盘价等于收盘价，则采用配色方案（数组）的最后一个元素 d3.schemeSet1[8] 即灰色 #999999
    .attr("stroke", d => d.Open > d.Close ? d3.schemeSet1[0]
      : d.Close > d.Open ? d3.schemeSet1[2]
        : d3.schemeSet1[8]);

  /**
   *
   * 为图表添加注释信息
   *
   */
  // 使用了 d3.utcFormat() 创建一个时间格式器，用于将日期对象转变为特定格式的字符串
  // 这里格式器的作用是将日期对象转换为「月份 日期，年份」格式的字符串
  const formatDate = d3.utcFormat("%B %-d, %Y");
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

  // 以 tooltip 的方式展示注释信息，即鼠标 hover 到特定的区域时才显示一个带有注释信息的浮窗
  g.append("title")
    // 设置文本内容
    .text(d => `${formatDate(d.Date)}
    Open: ${formatValue(d.Open)}
    Close: ${formatValue(d.Close)} (${formatChange(d.Open, d.Close)})
    Low: ${formatValue(d.Low)}
    High: ${formatValue(d.High)}`);

});
